---
title: "17: 람다 확장"
description: "명시적 템플릿 람다, 캡처 없는 클로저, consteval과 캡처 규칙을 공부합니다."
date: "2026-10-19"
order: 17
category: "C++"
subcategory: "C++20 — The Complete Guide"
tags: ["C++", "C++20", "Lambda", "Templates"]
image: ""
readingTime: ""
featured: false
draft: true
aiGenerated: true
---

[전체 학습 지도](/?post=cpp20-complete-guide-overview)

이 글은 『C++20 — The Complete Guide』의 [공개 공식 목차](https://leanpub.com/cpp20)와 [저자 예제 목록](https://www.cppstd20.com/code/toc.html)을 학습 순서의 기준으로 삼은 개인 공부 초안이다. 접근하지 못한 책 전체 본문을 읽고 요약했다는 뜻은 아니다. 언어와 라이브러리 규칙을 1차 자료로 확인하고, 설명과 예제는 독립적으로 재구성했다. 각 코드 블록은 서로 별개이며, 일부 코드 조각은 문맥을 함께 표시한다.

## 17.1 템플릿 매개변수를 쓰는 제네릭 람다

C++14의 `auto` 매개변수는 각 인자의 타입을 독립적으로 추론한다.
C++20의 명시적 템플릿 매개변수 목록은 같은 타입 관계나 컨테이너 구조를 표현하기 좋다.
함수 템플릿을 지역 범위 안의 작은 callable로 옮기는 느낌으로 읽을 수 있다.

```cpp
#include <vector>
#include <cassert>

int main() {
    auto last = []<class T>(const std::vector<T>& values) -> T {
        return values.back(); // 전제: 비어 있지 않다.
    };
    assert(last(std::vector<int>{2, 4}) == 4);

    auto same_type_sum = []<class T>(T a, T b) { return a + b; };
    assert(same_type_sum(2, 3) == 5);
    // same_type_sum(2, 3.0); // T에 int와 double이 충돌
    assert(same_type_sum.template operator()<double>(2, 3.0) == 5.0);
}
```

명시적으로 `operator()<T>`를 호출할 수 있지만, 호출자가 늘 이렇게 써야 한다면 보통 함수 템플릿이 더 읽기 쉬울 수 있다.
`requires` 절로 요구 조건을 붙이면 구현 안쪽의 오류보다 인터페이스 수준에서 제약을 드러낼 수 있다.
반환 타입의 `T`가 참조인지 값인지도 기존 함수 템플릿과 마찬가지로 살핀다.

## 17.2 캡처 없는 람다의 기본 생성

캡처가 없는 클로저 타입은 C++20에서 기본 생성과 대입을 지원한다.
따라서 비교자처럼 상태 없는 함수를 타입으로 전달하는 사용이 편해진다.
캡처 기본값을 적은 `[=]`와 캡처 목록이 비어 있는 `[]`를 무조건 같은 것으로 취급하지 않는다.

```cpp
#include <set>
#include <cassert>

int main() {
    auto by_abs = [](int a, int b) {
        // 이 예제는 작은 정수만 사용한다.
        int aa = a < 0 ? -a : a;
        int bb = b < 0 ? -b : b;
        return aa < bb;
    };
    std::set<int, decltype(by_abs)> values;
    values.insert(-3);
    values.insert(2);
    assert(*values.begin() == 2);
}
```

최솟값 정수에 단순 부호 반전을 적용하면 오버플로가 발생하므로 예제의 입력 범위를 계약으로 표시했다.
타입을 저장할 수 있게 된 것과 비교자가 엄격 약순서를 만족하는 것은 별개의 문제다.
절댓값이 같은 두 수를 동등하게 취급하는 의도도 검토해야 한다.

## 17.3 람다를 비타입 템플릿 인자로

캡처 없는 람다의 클로저 타입은 구조적 타입 조건을 만족할 수 있어 값 템플릿 인자로 쓸 수 있다.
이 방식은 컴파일 시점 정책을 값으로 전달할 때 유용하다.
서로 다른 람다 식은 본문이 같더라도 같은 타입이라는 보장이 없다.

```cpp
#include <cassert>

template<auto Operation>
int apply(int value) { return Operation(value); }

int main() {
    assert(apply<[](int x) { return x * 3; }>(4) == 12);
}
```

캡처 상태를 가진 람다까지 동일하게 허용된다고 확장해서 생각하지 않는다.
실행 중 변경해야 하는 정책은 일반 객체 매개변수가 더 알맞을 수 있다.

## 17.4 consteval 람다

`[]() consteval { ... }` 형태로 호출을 즉시 함수 규칙 아래에 둘 수 있다.
`constexpr`처럼 가능하면 컴파일 시점에 실행한다는 의미보다 강하다.
외부에서 실행 중에만 얻을 수 있는 값으로 호출하려 하면 즉시 호출 요구를 만족하지 못한다.

```cpp
constexpr int page_size = []() consteval { return 4 * 1024; }();
static_assert(page_size == 4096);
// 위 선언은 번역 단위 범위에 둘 수 있는 독립 코드 조각이다.
```

## 17.5 캡처 확장과 수명

`[=, this]`로 복사 기본 캡처와 `this` 캡처를 명시할 수 있다.
`this`는 객체 전체 복사와 다르며, 객체가 파괴된 뒤 람다를 호출하면 위험하다.
객체 복사가 목적이라면 `[*this]`의 의미와 복사 비용을 별도로 검토한다.

구조적 바인딩으로 얻은 이름을 캡처할 수 있다.
참조로 캡처하면 원래 바인딩과 대상의 수명이 콜백 실행까지 이어져야 한다.
값으로 캡처해도 그 값이 포인터나 view라면 소유권이 생기는 것은 아니다.

초기화 캡처의 팩 확장으로 가변 인자의 상태를 람다 안에 저장할 수 있다.
이때 복사할지 이동할지, 저장한 값을 나중에 몇 번 호출할지 먼저 결정한다.
코루틴 람다는 클로저 수명과 프레임 수명이 다를 수 있어 특히 주의한다.

## 17.6 복습 질문

- auto 매개변수 두 개와 하나의 명시적 T 매개변수는 어떻게 다른가?
- 상태 없는 비교자를 기본 생성해도 비교 의미가 올바른가?
- 캡처한 것이 객체 자체인가, 그 객체에 접근하는 참조인가?
- 비동기 실행까지 클로저가 살아 있는가?

## 복습에 사용한 1차 자료

- [C++20 초안 N4861: 람다 식](https://timsong-cpp.github.io/cppwp/n4861/expr.prim.lambda)
- [C++20 초안 N4861: 람다 캡처](https://timsong-cpp.github.io/cppwp/n4861/expr.prim.lambda.capture)
- [C++20 초안 N4861: 구조적 템플릿 매개변수 타입](https://timsong-cpp.github.io/cppwp/n4861/temp.param)
