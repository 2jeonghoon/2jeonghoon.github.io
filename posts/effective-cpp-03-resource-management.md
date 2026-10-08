---
title: "03: 자원 관리와 RAII"
description: "RAII 객체와 스마트 포인터로 자원 수명을 표현하고, 복사 정책과 원시 자원 접근, new/delete 짝, 독립 문장의 예외 안전성을 현대 C++ 코드로 정리합니다."
date: "2026-10-07"
order: 3
category: "C++"
subcategory: "Effective C++"
tags: ["C++","Effective C++","RAII","Smart Pointer"]
image: ""
readingTime: ""
featured: false
draft: false
aiGenerated: false
---
자원은 메모리만 뜻하지 않는다. 파일, 소켓, 잠금, GPU 핸들, 데이터베이스 트랜잭션처럼 반드시 해제해야 하는 모든 것이 자원이다. C++의 핵심 해법은 획득과 해제를 객체 수명에 묶는 RAII다.

## 아이템 13: 자원 관리에는 객체를 사용하자

직접 `new`와 `delete`를 짝지으면 중간의 조기 반환이나 예외 경로마다 해제를 기억해야 한다. 소유 객체를 지역 변수로 만들면 범위를 벗어날 때 소멸자가 항상 정리를 수행한다.

```cpp
std::unique_ptr<Texture> LoadTexture(const Path& path) {
    auto texture = std::make_unique<Texture>(path);
    texture->Upload();
    return texture;
}
```

기본 선택은 단독 소유권을 표현하는 `std::unique_ptr`다. 실제로 여러 소유자가 같은 수명을 공유해야 할 때만 `std::shared_ptr`를 사용한다. shared pointer는 소유 관계를 흐리게 만들 수 있고 순환 참조는 자동으로 끊지 못한다. 비소유 관찰자는 포인터나 참조, 필요하다면 `std::weak_ptr`로 표현한다.

메모리가 아닌 자원도 같은 방식으로 감싼다.

```cpp
using File = std::unique_ptr<FILE, decltype(&std::fclose)>;

File OpenFile(const char* path) {
    return File(std::fopen(path, "rb"), &std::fclose);
}
```

## 아이템 14: 자원 관리 객체의 복사를 신중히 설계하자

RAII 타입을 복사하면 자원은 어떻게 되어야 할까? 선택지는 하나가 아니다.

- 복사를 금지한다: 소켓, 뮤텍스처럼 소유자가 하나여야 하는 자원
- 소유권을 공유한다: 참조 카운트가 의미에 맞는 불변 데이터
- 자원을 복제한다: 독립된 파일 핸들 또는 버퍼가 필요한 값 타입
- 소유권을 이동한다: 현대 C++의 move-only 타입

정책은 구현 세부가 아니라 타입 의미의 일부다. 이름과 인터페이스에서 사용자가 예측할 수 있어야 한다.

```cpp
class GpuBuffer {
public:
    GpuBuffer(const GpuBuffer&) = delete;
    GpuBuffer& operator=(const GpuBuffer&) = delete;
    GpuBuffer(GpuBuffer&&) noexcept;
    GpuBuffer& operator=(GpuBuffer&&) noexcept;
};
```

## 아이템 15: 원시 자원 접근이 필요하면 명시적으로 제공하자

레거시 API는 raw handle이나 포인터를 요구할 수 있다. RAII 래퍼가 이를 완전히 숨기려고 하면 오히려 사용하기 어려워진다. `get()`이나 명시적 변환처럼 소유권을 넘기지 않는 접근을 제공한다.

```cpp
NativeSocket Socket::native_handle() const noexcept {
    return handle_;
}
```

원시 값을 반환해도 호출자가 닫아서는 안 된다는 계약이 분명해야 한다. `release()`처럼 소유권을 실제로 넘기는 함수는 이름으로 위험을 드러내고, 호출 후 래퍼가 빈 상태가 된다는 조건을 문서화한다.

## 아이템 16: `new`와 `delete`의 형태를 맞추자

단일 객체를 `new`로 만들었다면 `delete`, 배열을 `new[]`로 만들었다면 `delete[]`를 사용해야 한다. 둘을 섞으면 정의되지 않은 동작이다.

```cpp
auto enemies = std::make_unique<Enemy[]>(count);
```

현대 코드에서는 직접 배열 new를 사용할 이유가 드물다. 크기가 변하면 `std::vector`, 고정 크기면 `std::array`, 동적 배열을 꼭 단독 소유해야 한다면 `std::unique_ptr<T[]>`를 사용한다. 타입 별칭 안에 배열 여부를 숨기면 삭제 형태를 알기 어려워지므로 소유 컨테이너를 더 명시적으로 선택한다.

## 아이템 17: `new`로 만든 객체는 즉시 스마트 포인터에 넣자

책이 쓰일 당시에는 한 문장 안의 인수 평가 순서 때문에 자원 누수가 발생할 수 있었다. 현대 C++에서는 `std::make_unique`와 `std::make_shared`가 객체 생성과 소유권 획득을 하나의 연산으로 묶는다.

```cpp
ProcessPlayer(
    std::make_shared<Player>(playerId),
    QueryPriority());
```

가능하면 raw `new` 자체를 작성하지 않는다. 팩토리 함수가 스마트 포인터나 완성된 값을 반환하면 소유권이 즉시 표현되고 예외 경로도 단순해진다. 다만 `make_shared`는 객체와 제어 블록의 수명 및 할당을 결합하므로, weak pointer가 오래 남는 대형 객체나 사용자 정의 삭제자가 필요한 경우에는 별도 생성을 검토한다.

## 게임 개발에서의 적용

RAII는 예외를 사용하는 애플리케이션에만 필요한 기법이 아니다. 게임 코드에서도 함수의 여러 반환 경로, 로딩 실패, 디바이스 재생성, 세션 종료가 있다. 텍스처, 버퍼, 파일, 소켓, 잠금을 소유 객체로 감싸면 성공과 실패 경로 모두 같은 정리 규칙을 따른다.

```cpp
class ScopedRenderPass {
public:
    explicit ScopedRenderPass(CommandList& commands)
        : commands_(commands) { commands_.BeginPass(); }

    ~ScopedRenderPass() { commands_.EndPass(); }

    ScopedRenderPass(const ScopedRenderPass&) = delete;
    ScopedRenderPass& operator=(const ScopedRenderPass&) = delete;

private:
    CommandList& commands_;
};
```

이 타입은 범위를 벗어날 때 렌더 패스를 닫는다는 규칙을 강제한다. 단, 소멸자에서 호출하는 정리 함수가 예외를 던지지 않는다는 전제가 필요하다.

## 체크리스트

- 자원 획득 직후 소유 객체에 넣는다.
- 기본 소유권은 `unique_ptr`, 공유가 도메인 의미일 때만 `shared_ptr`를 쓴다.
- 비소유 포인터와 소유 포인터를 인터페이스에서 구분한다.
- RAII 타입의 복사·이동 정책을 명시한다.
- 원시 핸들 접근과 소유권 이전 API를 구분한다.
- 직접 `new[]`와 `delete[]`를 쓰기 전에 표준 컨테이너를 검토한다.

## 참고 자료

- [C++ Core Guidelines: Resource management](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#S-resource)
- [Microsoft Learn: Object lifetime and RAII](https://learn.microsoft.com/en-us/cpp/cpp/object-lifetime-and-resource-management-modern-cpp)
- [Effective C++ 학습 노트](https://www.kuniga.me/blog/2023/02/15/review-effective-cpp.html)
