---
title: "03: 콘셉트, 요구사항과 제약"
description: "템플릿의 사용 조건을 선언하고 문법 조건과 의미 조건을 구분한다."
date: "2026-10-19"
order: 3
category: "C++"
subcategory: "C++20 — The Complete Guide"
tags: ["C++", "C++20", "Concepts", "Constraints"]
image: ""
readingTime: ""
featured: false
draft: true
aiGenerated: true
---

[시리즈 학습 지도](/?post=cpp20-complete-guide-overview)

[공식 목차](https://leanpub.com/cpp20)와 [저자 공개 예제 목록](https://www.cppstd20.com/code/toc.html)을 바탕으로 학습 주제를 잡고 언어 규칙에 따라 다시 설명한 개인 노트다. 비공개 본문을 읽었다고 가정하지 않는다. 코드는 독자적으로 작성했다.

## 3.1 템플릿의 요구를 호출 경계에 드러내기

템플릿은 본문을 인스턴스화할 때까지 잘못된 타입을 받아들이는 것처럼 보일 수 있다.
콘셉트는 타입이나 값이 만족할 조건에 이름을 붙인다.
제약은 그 조건을 함수 등 선언의 사용 가능 여부에 연결한다.
요구사항은 유효한 표현식이나 타입 등 조건을 구성하는 재료다.

아래는 독립 실행 예제다.

```cpp
#include <concepts>
#include <string>
#include <cassert>

template<class T>
concept HasCount = requires(const T& value) {
    { value.size() } -> std::convertible_to<unsigned long>;
};

template<HasCount T>
bool has_many(const T& value) {
    return value.size() > 3;
}

int main() {
    assert(has_many(std::string{"study"}));
    static_assert(!HasCount<int>);
}
```

핵심은 오류 문구를 예쁘게 만드는 것보다 **사용 가능한 연산의 계약**을 옮기는 것이다.
실제 구현이 요구하지 않는 기본 생성이나 복사까지 추가로 강요하면 재사용 범위가 줄어든다.
반대로 크기를 사용하면서 크기 연산의 조건을 빼먹으면 본문 오류가 다시 생긴다.

## 3.2 제약을 붙일 수 있는 위치

함수 템플릿뿐 아니라 클래스, 별칭, 변수 템플릿에도 제약을 적용할 수 있다.
클래스 템플릿의 멤버 함수에는 해당 연산을 제공할 조건을 별도로 붙일 수 있다.
클래스 자체의 사용 가능성과 특정 멤버의 호출 가능성을 구분하면 인터페이스가 유연해진다.

다음은 선언 조각이다.

```cpp
template<class T> requires std::integral<T>
using Counter = T;

template<class T>
inline constexpr bool integer_counter = std::integral<T>;

template<std::integral auto Capacity>
struct FixedCapacity {};
```

마지막 제약은 비타입 템플릿 인수의 **타입**이 정수 계열인지를 검사한다.
용량이 양수여야 한다면 `requires (Capacity > 0)` 같은 값 조건도 필요하다.
콘셉트 이름이 붙어 있다는 사실만으로 모든 의미 조건이 표현된 것은 아니다.

## 3.3 실제 코드에 적용하기

라이브러리 선언에 `input_range`가 있으면 최소 순회 능력이 요구된다고 읽을 수 있다.
콘셉트를 진단 용어로 익히면 구현 내부의 긴 타입 이름 대신 요구 능력을 중심으로 오류를 읽는다.

제약이 거짓이면 해당 함수 템플릿을 후보에서 제외할 수 있다.
그 결과 다른 오버로드가 선택되거나, 적합한 함수가 없다는 오류가 발생한다.
함수 본문 안의 `static_assert`와 후보 선정 시점이 다르다.

`if constexpr (requires { value.reserve(10); })`처럼 선택 가능한 기능을 검사할 수도 있다.
이는 오버로드 집합을 나누는 일과 달리 하나의 함수 안에서 구현 경로를 고르는 방식이다.
두 경로가 같은 공개 의미를 제공할 때 특히 읽기 쉽다.

기존 SFINAE와 `enable_if`도 후보 제외를 표현했지만 선언의 구조가 복잡해지기 쉬웠다.
치환 실패가 나야 하는 위치와 본문 오류를 혼동하지 않도록 주의한다.
콘셉트로 바꿀 때도 선택되던 오버로드가 바뀌지 않는지 확인해야 한다.

## 3.4 컴파일러가 검사하지 못하는 의미 조건

`a == b`가 컴파일된다고 동등 관계가 증명되지는 않는다.
비교가 호출 때마다 무작위 값을 내놓아도 표현식 자체는 유효할 수 있다.
반사성, 대칭성, 추이성 같은 의미는 타입 작성자와 호출자가 지켜야 한다.

표준은 문법 조건을 만족하는 것과 의미까지 모델링하는 것을 구분한다.
알고리즘이 기대하는 의미를 위반하면 단순히 느려지는 문제가 아닐 수 있다.
비교자나 반복자의 계약은 문서, 설계 검토, 목적 있는 테스트로 보완한다.

## 3.5 콘셉트 설계 원칙

`HasPlus`처럼 토큰 하나를 검사하기보다 `Amount`처럼 안정된 사용 의미를 묶을지 검토한다.
그러나 너무 넓은 콘셉트 하나를 모든 함수에 붙이면 필요하지 않은 능력까지 강요한다.
여러 연산에서 재사용되고 의미가 설명되는 최소한의 묶음을 찾는 것이 목표다.

타입 특성은 성질을 계산하고, 콘셉트는 제약 체계와 오버로드 선택에 참여한다.
같은 불리언 값을 낸다고 오버로드의 포함 관계까지 항상 같은 것은 아니다.
공통 조건을 이름 있는 콘셉트로 재사용하는 이유는 4장의 원자 제약에서 이어진다.

## 3.6 복습과 다음 실험

1. `size()`만 사용하는 함수에 `regular`까지 요구할 이유가 있는가?
2. 후보 제외와 함수 본문 `static_assert` 실패는 어떤 차이가 있는가?
3. 정수형 비타입 인수를 요구하는 것과 양의 값을 요구하는 것은 같은가?
4. 컴파일되는 비교자가 정렬 규칙을 위반하는 예를 만들어 볼 수 있는가?

참고한 1차 규칙은 [제약 체계](https://eel.is/c++draft/temp.constr)와 [표준 콘셉트](https://eel.is/c++draft/concepts)다. 링크는 최신 작업 초안이므로 C++20 이후 추가 사항은 이 글의 범위에서 제외한다.

예제의 실행 검증 여부는 시리즈 통합 검증 기록을 따른다.
