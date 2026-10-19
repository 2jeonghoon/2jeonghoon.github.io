---
title: "18: 컴파일 시간 계산"
description: "constinit, consteval, is_constant_evaluated와 constexpr 동적 메모리의 경계를 공부합니다."
date: "2026-10-19"
order: 18
category: "C++"
subcategory: "C++20 — The Complete Guide"
tags: ["C++", "C++20", "constexpr", "consteval", "constinit"]
image: ""
readingTime: ""
featured: false
draft: true
aiGenerated: true
---

[전체 학습 지도](/?post=cpp20-complete-guide-overview)

이 글은 『C++20 — The Complete Guide』의 [공개 공식 목차](https://leanpub.com/cpp20)와 [저자 예제 목록](https://www.cppstd20.com/code/toc.html)을 학습 순서의 기준으로 삼은 개인 공부 초안이다. 접근하지 못한 책 전체 본문을 읽고 요약했다는 뜻은 아니다. 언어와 라이브러리 규칙을 1차 자료로 확인하고, 설명과 예제는 독립적으로 재구성했다. 각 코드 블록은 서로 별개이며, 일부 코드 조각은 문맥을 함께 표시한다.

## 18.1 constinit은 초기화 시점을 확인한다

정적 저장 기간이나 스레드 저장 기간의 객체에 `constinit`을 붙이면 정적 초기화 요구를 컴파일러가 검사한다.
객체를 읽기 전용으로 만드는 지정자는 아니므로 초기화 후에는 값을 바꿀 수 있다.
`const`, `constexpr`, `constinit`이 각각 어떤 문제를 해결하는지 구별해야 한다.

```cpp
#include <cassert>

constinit int active_requests = 0;
constexpr int max_requests = 8;

int main() {
    active_requests += 2;
    assert(active_requests < max_requests);
}
```

서로 다른 번역 단위의 동적 초기화 순서에 의존하는 설계에서 정적 초기화를 강제하면 문제 범위를 줄일 수 있다.
그러나 모든 전역 객체의 의존성을 자동 해결하는 것은 아니다.
동적 초기화가 필요한 서비스라면 함수 지역 정적 객체나 명시적 초기화 단계를 고려한다.

## 18.2 consteval은 호출 조건을 강화한다

`constexpr` 함수는 상수 평가에 사용할 수 있고 실행 중에도 호출할 수 있다.
`consteval` 즉시 함수의 호출은 해당 규칙이 요구하는 상수 식 조건을 충족해야 한다.
일반 정수 타입 매개변수를 받더라도 그 함수 호출을 실행 중 계산으로 미룰 수는 없다.

```cpp
#include <cassert>

consteval int checked_square(int n) {
    if (n < 0 || n > 100) throw "out of range";
    return n * n;
}
constexpr int ordinary_square(int n) { return n * n; }

int main() {
    constexpr int known = checked_square(12);
    int input = 7;
    assert(known == 144);
    assert(ordinary_square(input) == 49);
    // checked_square(input); // input을 이 호출의 상수 식으로 사용할 수 없음
}
```

조건을 만족하지 않는 분기에서 던지기는 상수 평가를 실패시키는 한 방법이다.
함수 매개변수가 호출 시 상수라고 해서 함수 정의 안의 모든 `static_assert`에 그 이름을 사용할 수 있는 것은 아니다.
컴파일 시점에 알려진 값과 언어가 지정한 상수 평가 문맥은 같은 개념이 아니다.

## 18.3 constexpr 함수의 제약 완화

C++20은 상수 평가에서 수행할 수 있는 작업의 범위를 넓힌다.
소멸자, 가상 함수 등도 관련 조건을 만족하면 상수 평가에 참여할 수 있다.
그렇다고 입력·출력, 임의의 운영체제 호출, 모든 동적 객체 사용이 허용되는 것은 아니다.

컴파일 가능한 constexpr 함수인지와 특정 호출이 상수 식인지도 구분한다.
실행 중 경로에는 허용되어도 상수 평가에서는 사용할 수 없는 연산이 있을 수 있다.
실제 상수 사용 지점의 `static_assert`나 constexpr 초기화로 의도를 검증한다.

## 18.4 is_constant_evaluated

`std::is_constant_evaluated()`는 지금 상수 평가 중인지 관찰하는 도구다.
인자가 컴파일러 최적화로 상수처럼 보이는지 검사하는 함수가 아니다.
따라서 상수 평가 문맥과 일반 실행 문맥에서 다른 경로를 선택할 수 있다.

```cpp
#include <type_traits>
#include <cassert>

constexpr int context_mark() {
    if (std::is_constant_evaluated()) return 10;
    return 20;
}

int main() {
    static_assert(context_mark() == 10);
    assert(context_mark() == 20);
}
```

이 예제는 문맥 차이를 드러내기 위한 것이다. 업무 함수는 가능하면 경로가 달라도 같은 의미의 결과를 낸다.
`if constexpr (std::is_constant_evaluated())`는 조건 자체가 상수 평가 문맥이므로 런타임 분기 선택을 의도대로 구현하지 못한다.
정적 초기화의 시험적 상수 평가가 관련되는 경우도 있어 관찰 결과를 로그 정책처럼 쓰지 않는다.

## 18.5 임시 동적 메모리와 vector·string

상수 평가 중 동적 할당이 가능해졌지만 할당한 저장소는 관련 상수 평가 안에서 정리되어야 한다.
실행 시점까지 유지할 임의의 힙 객체를 컴파일 시점에 만들어 반환하는 일반 기능이 아니다.
가변 길이의 중간 계산에는 vector를 사용하고, 최종 결과는 정수나 고정 크기 배열로 줄일 수 있다.

```cpp
#include <vector>

constexpr int total_even() {
    std::vector<int> values{2, 4, 6};
    values.push_back(8);
    int sum = 0;
    for (int n : values) sum += n;
    return sum; // values와 할당 저장소는 평가 안에서 정리됨
}
static_assert(total_even() == 20);
int main() {}
```

최종 `constexpr std::vector` 객체가 장기 보관할 동적 메모리까지 일반적으로 허용된다고 해석하지 않는다.
string도 같은 관점으로 본다. 짧은 문자열의 내부 표현과 구현별 최적화에 의존한 성공을 이식 가능한 규칙으로 삼지 않는다.
반환 컬렉션은 배열 크기를 어떻게 타입 수준에서 결정할지 추가 설계가 필요하다.

## 18.6 다른 constexpr 확장

표준 알고리즘과 여러 유틸리티가 상수 평가에 참여할 수 있도록 확장되었다.
매번 별도 메타프로그래밍 구현을 만들기 전에 일반 루프와 표준 기능으로 충분한지 확인한다.
컴파일 시점 계산이 커지면 빌드 시간과 컴파일러 자원 사용이 늘어난다는 비용도 측정한다.

## 18.7 복습 질문

- constinit 객체가 수정 가능한 이유를 설명할 수 있는가?
- constexpr와 consteval이 호출자에게 주는 요구가 어떻게 다른가?
- 상수 평가 중 할당한 메모리는 어느 평가 안에서 해제되는가?
- 컴파일러 최적화와 언어의 상수 평가를 구별하는가?

## 복습에 사용한 1차 자료

- [C++20 초안 N4861: 상수 식](https://timsong-cpp.github.io/cppwp/n4861/expr.const)
- [C++20 초안 N4861: constinit](https://timsong-cpp.github.io/cppwp/n4861/dcl.constinit)
- [C++20 초안 N4861: 상수 평가 감지](https://timsong-cpp.github.io/cppwp/n4861/meta.const.eval)
- [C++20 초안 N4861: vector](https://timsong-cpp.github.io/cppwp/n4861/vector)
