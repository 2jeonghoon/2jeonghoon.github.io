---
title: "Effective C++ 공부 08: new와 delete 커스터마이징"
description: "new-handler, 전역·클래스별 할당 함수 교체, operator new/delete 작성 규칙과 placement new 실패 경로를 메모리 추적과 게임 엔진 사례에 연결합니다."
date: "2026-10-06"
order: 8
category: "C++"
subcategory: "Effective C++"
tags: ["C++", "Effective C++", "Memory Allocation", "operator new"]
image: ""
readingTime: ""
featured: false
draft: false
aiGenerated: true
---

메모리 할당 함수를 바꾸는 일은 일반적인 최적화가 아니라 저수준 시스템 경계를 설계하는 작업이다. 표준 컨테이너, allocator, `std::pmr`로 해결할 수 있는지 먼저 확인하고, 전역 `new`와 `delete` 교체는 측정 가능한 필요가 있을 때만 선택한다.

## 아이템 49: `new-handler`의 동작을 이해하자

할당에 실패하면 일반적인 `operator new`는 등록된 `new_handler`를 호출한다. 핸들러는 메모리를 확보하거나, 다른 핸들러를 설치하거나, 자신을 제거하거나, 예외를 던지거나, 프로그램을 종료해야 한다. 아무 변화 없이 반환하면 같은 실패가 반복될 수 있다.

```cpp
void OutOfMemory() {
    ReleaseEmergencyPool();
    std::set_new_handler(nullptr);
}

int main() {
    std::set_new_handler(OutOfMemory);
}
```

게임에서는 비상 메모리를 확보해 오류 UI와 로그를 남길 여지를 만들 수 있다. 그러나 핸들러 안에서 다시 동적 할당하는 로깅 시스템을 호출하면 재귀 실패가 생길 수 있으므로, 실패 경로는 미리 할당된 자원만 사용하도록 설계한다.

## 아이템 50: `new`와 `delete` 교체가 의미 있는 경우를 알자

교체 목적에는 잘못된 할당 탐지, 통계 수집, 특정 크기 객체의 성능 개선, 정렬 보장, 플랫폼 메모리 영역 사용 등이 있다. 먼저 표준 도구와 프로파일러가 요구를 충족하는지 확인한다.

현대 C++에서는 컨테이너별 메모리 정책에 allocator와 `std::pmr::memory_resource`를 사용할 수 있다. 이는 전역 동작을 바꾸지 않고 프레임 임시 메모리나 패킷 처리용 arena를 특정 객체 그래프에 적용하기 쉽다.

```cpp
std::byte buffer[4096];
std::pmr::monotonic_buffer_resource arena(buffer, sizeof buffer);
std::pmr::vector<Command> commands(&arena);
```

monotonic resource는 개별 해제 대신 전체 영역을 한 번에 버리는 수명에 적합하다. 오래 살아야 하는 객체를 이 영역 밖으로 이동시키면 dangling reference가 생기므로 수명 경계를 엄격히 지킨다.

## 아이템 51: `operator new`와 `delete`의 관례를 지키자

사용자 정의 `operator new`도 요청 크기 0 처리, 올바른 정렬, 반복적인 new-handler 호출, 최종 실패 시 `std::bad_alloc` 같은 표준 계약을 지켜야 한다. 클래스별 할당 함수는 파생 클래스 객체의 크기가 다를 수 있다는 점도 고려한다.

```cpp
void* Widget::operator new(std::size_t size) {
    if (size != sizeof(Widget)) {
        return ::operator new(size);
    }
    return WidgetPool::Allocate();
}

void Widget::operator delete(void* memory, std::size_t size) noexcept {
    if (!memory) return;
    if (size != sizeof(Widget)) {
        ::operator delete(memory);
        return;
    }
    WidgetPool::Deallocate(memory);
}
```

위 예제는 크기가 다른 파생 객체를 전역 할당자로 보냈다면 sized delete에서도 같은 조건으로 전역 할당자에 돌려준다. 이 분기에 의존하려면 크기 없는 클래스 전용 delete를 함께 제공하지 않아야 한다. 실제 구현에서는 over-aligned 타입, 배열 형태, 생성자 실패 경로, 스레드 안전성까지 다뤄야 한다. 일부 overload만 제공하면 예상과 다른 함수가 선택될 수 있으므로, 직접 교체보다 검증된 allocator나 메모리 리소스를 우선한다.

## 아이템 52: placement new를 만들면 placement delete도 만들자

추가 인수를 받는 `operator new`로 메모리를 얻은 뒤 생성자가 예외를 던지면, 컴파일러는 동일한 추가 인수 형태의 `operator delete`를 찾아 메모리를 회수한다. 짝이 없으면 생성에 실패한 메모리를 잃을 수 있다.

```cpp
class Packet {
public:
    static void* operator new(std::size_t size, MemoryPool& pool) {
        return pool.Allocate(size);
    }

    static void operator delete(void* memory, MemoryPool& pool) noexcept {
        pool.Deallocate(memory);
    }
};
```

일반 delete와 placement delete는 호출되는 상황이 다르다. placement delete는 대응하는 placement new 이후 생성자 실패 때 사용되고, 정상 생성된 객체를 일반 `delete`로 지울 때 자동으로 같은 인수가 다시 제공되지는 않는다. 소유 객체와 전용 팩토리로 전체 수명을 감싸는 편이 안전하다.

## 게임 엔진에서의 판단 기준

- 메모리 부족 경로는 추가 할당 없이 동작하도록 준비한다.
- 프레임·레벨·세션처럼 함께 사라지는 수명에는 arena를 검토한다.
- 전역 할당자 교체 전에 프로파일링으로 크기 분포와 병목을 확인한다.
- 정렬, 멀티스레드, 생성자 예외, 파생 타입 크기를 테스트한다.
- 사용자 정의 placement new와 정확히 대응하는 delete를 제공한다.
- 할당 최적화가 객체 소유권과 수명을 가리지 않게 한다.

## 참고 자료

- [C++ Core Guidelines: Allocation and deallocation](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#S-alloc)
- [Effective C++ 3판 공식 소개](https://www.pearson.com/en-gb/subject-catalog/p/effective-c-55-specific-ways-to-improve-your-programs-and-designs/P200000000473)
- [Effective C++ 항목별 짧은 노트](https://clchiou.github.io/notes-effective-c%2B%2B/)
