---
title: "04: 콘셉트와 제약의 세부 규칙"
description: "requires 절과 표현식, 원자 제약과 포함 관계를 순서대로 정리한다."
date: "2026-10-19"
order: 4
category: "C++"
subcategory: "C++20 — The Complete Guide"
tags: ["C++", "C++20", "requires", "Constraints"]
image: ""
readingTime: ""
featured: false
draft: true
aiGenerated: true
---

[시리즈 학습 지도](/?post=cpp20-complete-guide-overview)

[공식 목차](https://leanpub.com/cpp20)와 [저자 공개 자료](https://www.cppstd20.com/code/toc.html)를 학습 경로로 사용하고 표준 규칙으로 재구성했다. 비공개 본문을 읽고 요약한 글은 아니다. 예제는 이 노트용 원본이다.

## 4.1 제약은 선언의 사용 조건이다

제약은 실행 중 검사하는 `if`가 아니다.
템플릿 인수를 대입하고 조건을 만족하는지 확인하여 선언이 참여할 수 있는지 결정한다.
논리곱, 논리합, 원자 제약으로 정규화되는 구조가 오버로드 선택에도 영향을 준다.

유효한 호출인지와 본문 전체가 컴파일되는지는 별개의 문제다.
제약을 만족했어도 본문에서 요구하지 않은 연산을 사용하면 오류가 난다.
제약은 구현의 모든 결함을 자동 검출하는 정리 증명기가 아니다.

## 4.2 requires 절로 조건을 선언하기

다음은 함수 정의 조각이다.

```cpp
#include <concepts>

template<class T>
requires std::integral<T>
T next_value(T value) { return value + 1; }

template<class T>
T previous_value(T value) requires std::integral<T> {
    return value - 1;
}
```

앞의 `requires` 절과 뒤의 `requires` 절은 선언의 서로 다른 위치에서 제약을 연결한다.
일관된 스타일을 택하되, 재선언할 때는 제약을 포함한 선언 형식을 함부로 바꾸지 않는다.
논리적으로 같은 조건이라고 재선언 규칙까지 같다고 가정하지 않는다.

`&&`와 `||`의 제약 만족도 검사는 왼쪽부터 진행되고 필요한 경우만 오른쪽을 본다.
먼저 타입이 있는지 검사하고 그 타입을 사용하는 조건을 뒤에 둘 수 있다.
단, 일반 함수 호출 속에 숨긴 연산이 항상 안전한 치환 실패가 되는 것은 아니다.

## 4.3 임시 불리언 표현식의 경계

콘셉트를 만들지 않고 `requires (sizeof(T) <= 8)` 같은 조건을 쓸 수 있다.
복잡한 상수 표현식은 괄호가 필요한 문법 위치를 주의한다.
원자 제약의 결과는 `bool` 타입 상수 표현식이어야 한다.
사용자 정의 타입의 명시적 `operator bool`이 있다고 모든 제약에 대신 쓸 수 있는 것은 아니다.

한 번 쓰는 구조적 조건에는 임시 표현식이 간단하다.
여러 오버로드에서 같은 의미를 공유한다면 이름 있는 콘셉트가 더 정확하다.
그 이유는 문서화뿐 아니라 제약의 동일성에도 있다.

## 4.4 requires 표현식의 네 가지 요구사항

`requires` 표현식은 조건을 검사해서 `bool`을 만든다.
`requires` 절은 그 조건을 선언에 연결한다. 같은 키워드지만 역할이 다르다.

아래는 독립 실행 예제다.

```cpp
#include <concepts>
#include <vector>

template<class T>
concept BufferLike = requires(T& value) {
    value.clear();                         // 단순 요구사항
    typename T::value_type;                 // 타입 요구사항
    { value.size() } -> std::integral;       // 복합 요구사항
    requires sizeof(typename T::value_type) <= 8; // 중첩 요구사항
};

int main() {
    static_assert(BufferLike<std::vector<int>>);
    static_assert(!BufferLike<int>);
}
```

단순 요구사항은 식이 유효한지만 본다. 식의 참값을 요구하지 않는다.
`value.empty();`라고 적으면 비어 있어야 한다는 뜻이 아니다.
타입 요구사항은 이름이 타입을 가리키는지 본다.
복합 요구사항에는 `noexcept`와 반환 타입 제약을 덧붙일 수 있다.
여기서 반환 제약은 식의 `decltype((expression))`에 적용된다.
중첩 요구사항은 별도의 제약 표현식이 참이어야 한다고 명시한다.

검사 대상 식은 평가되지 않는다.
하지만 비템플릿 문맥의 명백한 잘못까지 모두 `false`로 바꾸는 만능 오류 처리법은 아니다.
모든 가능한 치환에서 실패하도록 만든 잘못된 요구사항도 올바른 설계가 아니다.

## 4.5 콘셉트 자체의 성질

콘셉트는 네임스페이스 범위의 이름 있는 제약 템플릿이다.
일반 변수 템플릿처럼 부분 특수화해서 조건을 갈아끼우는 도구가 아니다.
타입 매개변수뿐 아니라 비타입 매개변수에 대한 조건도 정의할 수 있다.

이름을 붙일 때는 `SupportsOperation`이 실제로 어떤 의미까지 보장하는지 적는다.
문법 검사가 통과하는 것과 의미적 계약을 모델링하는 것을 분리한다.

## 4.6 타입 제약으로 축약하기

`std::integral auto value`는 추론한 타입에 정수 콘셉트를 적용한다.
`std::same_as<int> auto`는 추론한 타입을 첫 번째 인수로 넣어 관계를 검사한다.
반환 타입 제약의 `-> Concept`도 같은 방식으로 추가 인수를 받는다.
짧아진 문법이 타입 추론 규칙을 바꾸지는 않는다.

## 4.7 제약의 포함 관계와 오버로드

더 강한 제약이 약한 제약을 포함하면 더 특화된 후보를 고를 수 있다.
그러나 컴파일러가 임의의 수학 논리식을 증명하는 것은 아니다.
원자 제약의 출처와 매개변수 대응이 중요하다.

`A<T> && B<T>`로 강한 콘셉트를 만들면 기존 `A<T>`의 원자를 재사용한다.
같은 식을 여러 위치에 그대로 복사한 경우는 같은 원자가 아닐 수 있다.
대칭 관계 콘셉트는 피연산자 방향을 바꿔도 포함 관계가 유지되도록 설계해야 한다.
표준 `same_as`의 양방향 구조가 이런 설계의 좋은 학습 대상이다.

## 복습 질문

1. 단순 요구사항 `sizeof(T) > 4;`는 크기 조건을 검사하는가?
2. `requires requires(T x) { x.run(); }`의 두 키워드는 각각 무엇인가?
3. 같은 불리언 식을 복사하는 것과 콘셉트를 재사용하는 것은 왜 다른가?

[requires 표현식](https://eel.is/c++draft/expr.prim.req)과 [제약 정규화·포함 관계](https://eel.is/c++draft/temp.constr)로 규칙을 대조했다. 현재 초안의 C++26 제약 확장 등은 여기서 다루지 않는다.

예제의 실행 검증 여부는 시리즈 통합 검증 기록을 따른다.
