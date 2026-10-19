---
title: "06: 람다 표현식"
description: "Item 31–34. 캡처 수명, 초기화 캡처, 제네릭 람다 전달과 bind의 차이를 공부합니다."
date: "2026-10-19"
order: 6
category: "C++"
subcategory: "Effective Modern C++"
tags: ["C++", "Effective Modern C++", "Lambda", "캡처"]
image: ""
readingTime: ""
featured: false
draft: true
aiGenerated: true
---

[공식 목차](https://www.oreilly.com/library/view/effective-modern-c/9781491908419/)의 6장 Item 31–34를 순서대로 공부한다. 공개 목차와 언어 참조를 사용한 독자적인 학습 노트이며 책 본문 전체의 번역이 아니다. 코드 블록은 서로 독립적인 C++11/14 선언·함수 조각이다.

## Item 31. 기본 캡처 모드 대신 필요한 대상을 명시하기

참조 캡처는 원본 수명을 늘리지 않는다. 저장하거나 비동기로 실행할 람다가 지역 변수를 참조하면 함수 반환 뒤 끊긴 참조가 될 수 있다.

```cpp
#include <functional>
std::function<int(int)> makeAdder(int offset) {
    return [offset](int value) { return value + offset; };
}
```

offset을 값으로 복사했으므로 반환 후에도 사용할 수 있다. `[&]`였다면 함수 매개변수의 수명이 끝난 뒤 접근할 수 없다. 캡처할 대상이 여럿이라도 `[offset, scale]`처럼 이름을 쓰면 코드 검토 시 의존성이 보인다.

C++11/14에서 멤버를 사용하는 `[=]`는 객체 전체를 복사하는 뜻이 아니다. this 포인터를 통해 원본 객체를 사용할 수 있어 객체 파괴 뒤에는 위험하다. 포인터를 값으로 캡처해도 포인터 대상의 수명은 늘어나지 않는다.

```cpp
class Meter {
    int factor_ = 4;
public:
    auto calculator() const { // C++14 반환 타입 추론
        int factor = factor_;
        return [factor](int input) { return input * factor; };
    }
};
```

필요한 값만 복사하면 원본 Meter의 수명과 계산기를 분리할 수 있다. 반대로 실행 시점의 최신 상태가 필요하면 weak_ptr 등으로 생존 확인과 접근 정책을 설계해야 한다. [람다 캡처 명세](https://eel.is/c++draft/expr.prim.lambda.capture)

## Item 32. 자원을 옮겨 담으려면 초기화 캡처 사용하기

```cpp
#include <memory>
#include <utility>
void ownResource() {
    auto resource = std::make_unique<int>(17);
    auto task = [owned = std::move(resource)] {
        return *owned;
    }; // C++14
    int value = task();
    (void)value;
}
```

캡처 이름과 초기화 식을 분리해 클로저 안에 새 멤버를 만든다. unique_ptr처럼 복사할 수 없는 객체도 이동으로 소유할 수 있다. 원래 resource는 이동 후 비어 있다.

기본 호출 연산자가 const라는 사실이 포인터 대상까지 const로 만드는 것은 아니다. 캡처한 포인터 변수 자체를 재대입하려면 mutable이 필요하지만 대상 수정 가능성은 포인터 타입과 대상 타입으로 정해진다.

이 클로저는 unique_ptr 멤버 때문에 복사할 수 없다. C++11/14의 std::function은 저장 대상의 복사 가능성을 요구하므로 그대로 넣을 수 없다. 콜백 저장 방식까지 함께 선택한다. [std::function 요구 사항](https://eel.is/c++draft/func.wrap.func)

C++11만 지원해야 한다면 직접 함수 객체를 만들거나 bind를 이용한 우회가 가능하지만 소유권과 const 호출 규칙을 더 자세히 확인해야 한다. 초기화 캡처 문법을 C++11 기능이라고 적지 않는다.

## Item 33. 제네릭 람다에서 decltype으로 원래 인수 전달하기

```cpp
#include <utility>
void deliver(const int&) {}
void deliver(int&&) {}

auto relay = [](auto&& value) { // C++14
    deliver(std::forward<decltype(value)>(value));
};
```

제네릭 람다의 auto 매개변수는 호출 연산자 템플릿의 타입 매개변수처럼 동작한다. value라는 이름은 함수 안에서 lvalue이지만 decltype(value)는 선언된 참조 타입을 유지한다. 이를 forward의 타입 인수로 사용하면 원래 값 범주를 전달할 수 있다.

```cpp
#include <utility>
auto invoke = [](auto&& function, auto&&... args) -> decltype(auto) {
    return std::forward<decltype(function)>(function)(
        std::forward<decltype(args)>(args)...);
};
```

이 코드는 일반 함수 객체 호출의 전달 예제다. 모든 멤버 포인터 호출까지 지원하는 C++17 std::invoke와 같은 도구라고 생각하면 안 된다. 반환 참조가 있으면 호출 대상과 인수의 수명도 유지되어야 한다.

무조건 std::move를 사용하면 lvalue 인수도 소비 대상으로 바뀐다. 제네릭 람다를 짧게 쓴다고 호출자의 소유권을 임의로 변경해서는 안 된다. [클로저와 제네릭 호출 연산자](https://eel.is/c++draft/expr.prim.lambda.closure)

## Item 34. bind보다 람다로 평가 시점과 호출을 드러내기

```cpp
#include <functional>
int add(int left, int right) { return left + right; }
auto bound = std::bind(add, 10, std::placeholders::_1);
auto clearer = [](int value) { return add(10, value); };
```

이 예제에서 두 호출은 같은 계산을 하지만 람다는 매개변수 이름과 호출 식이 직접 보인다. 오버로드 선택도 람다 본문의 인수 타입을 통해 자연스럽게 표현할 수 있다.

bind의 일반적인 저장 인수는 바인딩 시점에 평가하고 저장한다. 람다는 캡처 초기화와 본문의 실행을 나누므로 언제 값을 얻는지 명확히 적을 수 있다.

```cpp
#include <chrono>
auto elapsedSinceCreation = [start = std::chrono::steady_clock::now()] {
    return std::chrono::steady_clock::now() - start;
}; // C++14, 시작은 생성 때, 현재 시각은 호출 때 평가
```

bind가 참조를 저장하게 하려면 std::ref 같은 표시를 고려해야 한다. 람다 참조 캡처 역시 수명 책임이 있으므로 문법을 바꿨다는 이유로 안전해지는 것은 아니다. 인수를 무시하거나 재배열하는 bind 특성과 중첩 bind의 평가 규칙도 리팩터링 때 확인한다. [bind의 저장·호출 규칙](https://eel.is/c++draft/func.bind)

## 복습 메모와 참고

- 콜백이 저장되는지, 즉시 호출되는지 먼저 적는다.
- 값 캡처한 포인터와 값 캡처한 객체를 구별한다.
- 이동 전용 캡처를 넣었다면 저장 컨테이너의 요구 사항을 확인한다.
- 전달 람다의 반환 타입과 수명까지 검토한다.

[저자의 책 소개](https://www.aristeia.com/EMC%2B%2B.html) · [C++ Core Guidelines의 람다 지침](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#SS-lambdas). 현재 초안에는 이후 표준 내용도 있다. `[*this]` 캡처는 C++17의 별도 기능이며 이 글의 기본 예제로 사용하지 않았다.

[이전: 이동과 완벽 전달](/?post=effective-modern-cpp-05-rvalue-references-move-forwarding) · [개요](/?post=effective-modern-cpp-overview) · [다음: 동시성 API](/?post=effective-modern-cpp-07-concurrency-api)
