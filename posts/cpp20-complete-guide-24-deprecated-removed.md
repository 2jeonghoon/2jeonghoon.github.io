---
title: "24: 사용 중단 권고와 제거된 기능"
description: "C++20 이전 코드를 옮길 때 deprecated와 removed를 구분하고 언어·라이브러리 변경을 점검합니다."
date: "2026-10-19"
order: 24
category: "C++"
subcategory: "C++20 — The Complete Guide"
tags: ["C++", "C++20", "Migration", "Deprecation", "Compatibility"]
image: ""
readingTime: ""
featured: false
draft: true
aiGenerated: true
---

[전체 학습 지도](/?post=cpp20-complete-guide-overview)

이 글은 『C++20 — The Complete Guide』의 [공개 공식 목차](https://leanpub.com/cpp20)와 [저자 예제 목록](https://www.cppstd20.com/code/toc.html)을 학습 순서의 기준으로 삼은 개인 공부 초안이다. 접근하지 못한 책 전체 본문을 읽고 요약했다는 뜻은 아니다. 언어와 라이브러리 규칙을 1차 자료로 확인하고, 설명과 예제는 독립적으로 재구성했다. 각 코드 블록은 서로 별개이며, 일부 코드 조각은 문맥을 함께 표시한다.

## 24.1 언어 기능의 사용 중단 권고와 제거

사용 중단 권고는 해당 기능이 당장 금지되었다는 뜻이 아니다.
제거된 기능은 표준 C++20 코드가 사용할 수 있는 범위에서 빠진 것이다.
컴파일러가 확장 모드로 받아 준다는 사실과 표준에서 허용된다는 사실을 구분한다.

### volatile의 역할을 다시 확인한다

C++20에서는 일부 volatile 연산 형태가 사용 중단 권고 대상이 되었다.
volatile 증가·감소나 복합 대입에 기대는 오래된 코드를 발견하면 실제로 필요한 의미부터 확인한다.
스레드 동기화가 목적이라면 volatile 자체는 데이터 경쟁을 막는 도구가 아니다.

```cpp
#include <atomic>
#include <thread>
#include <cassert>

int main() {
    std::atomic<int> finished{0};
    std::jthread first([&] { finished.fetch_add(1); });
    std::jthread second([&] { finished.fetch_add(1); });
    first.join();
    second.join();
    assert(finished.load() == 2);
}
```

메모리 매핑 장치 레지스터의 volatile 사용은 다른 문제다.
그런 코드를 무조건 atomic으로 치환하지 말고 플랫폼과 하드웨어 계약을 먼저 확인한다.
마이그레이션은 경고를 숨기는 작업보다 원래 의도를 복원하는 작업이다.

### 묵시적 this 캡처

`[=]`에서 `this`를 묵시적으로 캡처하는 방식은 사용 중단 권고 대상이다.
`[=, this]`로 명시할지 `[*this]`로 객체를 복사할지 수명 의도에 따라 정한다.
두 표현은 같은 의미의 경고 제거 방식이 아니다.

객체를 복사하면 별도 상태를 사용하고, this를 캡처하면 원래 객체에 의존한다.
비동기 콜백이라면 그 객체가 콜백 실행까지 살아 있는지 확인한다.

### 호환성 변화도 별도로 살핀다

`u8` 리터럴의 char8_t 도입은 제거 목록만 읽어서는 놓칠 수 있는 타입 호환성 변화다.
aggregate의 정의 변경도 기존 초기화 가능성에 영향을 줄 수 있다.
새 모드에서 실패한 모든 코드를 deprecated 기능 때문이라고 단정하지 않는다.

C++20에서는 대괄호 인덱스 안에서 괄호 없이 쉼표 연산자를 사용하는 표현이 사용 중단 권고 대상이다.
복수 인덱스를 `a[i, j]`로 쓰던 코드는 의도한 인덱싱인지 쉼표 연산자인지 검토한다.
언어 버전별 문법 변화와 실제 배열 접근 의미를 분리한다.

## 24.2 라이브러리 기능의 변화

### 24.2.1 사용 중단 권고 대상

`std::iterator`를 상속해 iterator의 관련 타입을 채우는 방식은 C++17부터 사용 중단 권고 대상이었다.
C++20 공부에서 만났다고 C++20에 처음 deprecated되었다고 기록하지 않는다.
필요한 관련 타입을 직접 선언하고 실제 iterator 연산과 개념 요구를 검토한다.

`shared_ptr` 대상의 독립적인 원자적 접근 함수들은 C++20에서 사용 중단 권고 대상이다.
새 코드에서는 `std::atomic<std::shared_ptr<T>>`로 의도를 타입에 드러내는 설계를 검토한다.
가리키는 객체의 내부 변경은 여전히 별도 동기화가 필요하다.

인자 없는 `basic_string::reserve()`도 사용 중단 권고 대상이다.
용량 확보에는 인자 있는 reserve, 축소 의도에는 shrink_to_fit 등 목적을 분명하게 구분한다.
`is_pod`는 standard-layout과 trivial 성질을 한 이름으로 묶는 대신 필요한 속성을 각각 검사하는 방향으로 옮긴다.

### 오래된 분류 이름 대신 필요한 조건 쓰기

```cpp
#include <type_traits>

struct WireHeader {
    unsigned version;
    unsigned size;
};

static_assert(std::is_standard_layout_v<WireHeader>);
static_assert(std::is_trivially_copyable_v<WireHeader>);
int main() {}
```

이 두 검사가 참이어도 이 구조체를 그대로 파일 포맷으로 사용하는 것이 이식 가능해지는 것은 아니다.
padding, 정수 크기, 바이트 순서가 별도 문제로 남는다.
왜 POD 여부를 검사했는지 실제 요구를 다시 적는 것이 핵심이다.

### 24.2.2 제거된 라이브러리 기능

`allocator`의 일부 오래된 멤버·별칭이 제거되어 allocator_traits 중심 코드로 옮겨야 한다.
`std::result_of`는 `std::invoke_result` 계열로 대체한다.
`std::not1`, `std::not2` 대신 `std::not_fn`이나 명시적 람다를 검토한다.

```cpp
#include <functional>
#include <type_traits>

int twice(int value) { return value * 2; }
using Result = std::invoke_result_t<decltype(twice), int>;
static_assert(std::is_same_v<Result, int>);

int main() {
    auto odd = std::not_fn([](int value) { return value % 2 == 0; });
    return odd(3) ? 0 : 1;
}
```

`auto_ptr`, `random_shuffle`처럼 C++17에서 이미 제거된 기능과 C++20의 제거를 섞지 않는다.
마이그레이션 기록에는 원래 표준, 권고가 시작된 표준, 제거된 표준을 따로 적는다.
벤더가 남긴 호환 선언을 사용하면 나중에 다른 환경에서 다시 실패할 수 있다.

## 24.3 복습 질문과 이행 순서

- 현재 경고는 새 C++20 권고인가, 이전 표준부터 누적된 문제인가?
- 제거된 인터페이스를 벤더 확장으로 우연히 사용하고 있지 않은가?
- 치환 후 수명, 동기화, 호출 의미가 보존되는가?
- 단순 이름 치환 대신 실제 필요한 타입 성질을 검사하는가?

우선 표준 모드와 경고 설정을 고정하고, 경고 종류별로 묶어 수정한다.
그다음 해당 기능에 의존하던 동작을 확인한다. 컴파일 성공만으로 실행 의미가 같다고 판단하지 않는다.

## 복습에 사용한 1차 자료

- [C++20 초안 N4861: 사용 중단 권고 기능](https://timsong-cpp.github.io/cppwp/n4861/depr)
- [C++20 초안 N4861: 이전 버전과 호환성](https://timsong-cpp.github.io/cppwp/n4861/diff.cpp17)
- [C++20 초안 N4861: volatile 관련 권고](https://timsong-cpp.github.io/cppwp/n4861/depr.volatile.type)
