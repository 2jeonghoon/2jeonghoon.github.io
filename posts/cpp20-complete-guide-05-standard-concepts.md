---
title: "05: 표준 콘셉트 자세히 보기"
description: "언어, 반복자, 범위와 호출 가능 객체의 표준 콘셉트를 읽는 방법."
date: "2026-10-19"
order: 5
category: "C++"
subcategory: "C++20 — The Complete Guide"
tags: ["C++", "C++20", "Concepts", "Iterators"]
image: ""
readingTime: ""
featured: false
draft: true
aiGenerated: true
---

[시리즈 학습 지도](/?post=cpp20-complete-guide-overview)

이 글은 [공식 목차](https://leanpub.com/cpp20)와 [저자의 공개 자료](https://www.cppstd20.com/code/toc.html)를 길잡이로 삼은 학습 재구성이다. 접근하지 않은 책 본문을 요약한 것으로 주장하지 않는다. 코드는 새로 작성했다.

## 5.1 표준 콘셉트 지도를 읽기

표준 콘셉트는 기능 목록이면서 알고리즘의 최소 요구를 읽는 언어다.
핵심 언어 성질은 `<concepts>`, 반복자는 `<iterator>`, 범위는 `<ranges>`에서 찾는다.
모든 콘셉트가 `std` 바로 아래에 있는 것은 아니다. 범위 콘셉트는 `std::ranges`에 있다.

더 강한 표준 콘셉트는 약한 콘셉트를 재사용하여 포함 관계를 구성한다.
이를 직접 비슷한 타입 특성 식으로 다시 적으면 오버로드 선택 관계가 달라질 수 있다.
표준 정의가 의도한 의미가 맞다면 이름을 그대로 쓰는 편이 낫다.

## 5.2 언어와 객체에 관한 콘셉트

`integral`, `signed_integral`, `unsigned_integral`, `floating_point`는 산술 타입 계열을 구분한다.
여기서 정수형이라고 도메인에서 숫자 계산에 적합하다는 보장은 없다.
`bool`도 `integral`이며 `unsigned_integral`을 만족할 수 있다는 점이 함정이다.

객체 콘셉트는 생성, 이동, 복사, 대입, 교환 능력을 묶는다.
`movable`은 단순히 이동 생성자 하나가 존재한다는 뜻보다 강하다.
`copyable`, `semiregular`, `regular`로 갈수록 추가 능력과 의미가 요구된다.
`regular`은 동등 비교까지 포함해 값처럼 다룰 수 있는 타입을 설명한다.

다음은 독립 실행 예제다.

```cpp
#include <concepts>
#include <memory>
#include <string>

int main() {
    static_assert(std::integral<bool>);
    static_assert(std::movable<std::unique_ptr<int>>);
    static_assert(!std::copyable<std::unique_ptr<int>>);
    static_assert(std::regular<std::string>);
    static_assert(std::same_as<int, signed int>);
    static_assert(std::convertible_to<int, double>);
}
```

`same_as`는 타입 동일성을, `derived_from`은 공개적이고 모호하지 않은 상속 관계를 다룬다.
`convertible_to`는 명시적 변환식과 암시적 변환의 관계 및 의미도 요구한다.
`common_reference_with`와 `common_with`는 두 타입이 함께 사용될 때의 공통 표현을 다룬다.
변환이 된다는 이유만으로 값이 손실되지 않는다고 가정하지 않는다.

비교 콘셉트는 `equality_comparable`, `totally_ordered`처럼 연산의 집합과 의미를 묶는다.
컴파일러는 비교식 존재 여부를 확인할 수 있어도 모든 값의 순서 법칙을 증명하지는 못한다.
NaN을 허용하는 실수 값을 정렬할 때는 타입 수준의 통과와 데이터 정책을 구분한다.

## 5.3 반복자와 범위에 관한 콘셉트

`range`는 시작과 끝에 접근할 수 있는 객체를 뜻한다.
`input_range`는 읽는 순회, `forward_range`는 여러 번의 안정된 순회를 요구한다.
`bidirectional_range`, `random_access_range`, `contiguous_range`로 갈수록 탐색 능력이 강해진다.
`sized_range`와 `common_range`는 이 계층과 별개 축이다.

`sized_range`라고 임의 접근이 되는 것은 아니다.
`common_range`는 시작 반복자와 끝 센티널 타입이 같은지를 말한다.
`borrowed_range`는 범위 래퍼 소멸 후에도 반복자 유효성이 유지되는지를 표현한다.
참조된 원본의 수명까지 연장하는 장치는 아니다.

포인터 같은 객체를 다루는 `indirectly_readable`과 `indirectly_writable`도 중요하다.
역참조 결과가 항상 `T&`라는 가정은 프록시 반복자에서 깨진다.
알고리즘의 제약은 값 타입과 참조 타입 사이의 일관성까지 다룬다.

`sortable`, `permutable`, `mergeable`은 반복자를 통해 가능한 작업을 묶는다.
예를 들어 정렬은 임의 접근뿐 아니라 원소 재배치와 비교의 조건도 필요하다.
오류가 나면 순회 능력, 쓰기 능력, 비교자 조건 중 어디가 부족한지 분리해서 읽는다.

## 5.4 호출 가능 객체의 콘셉트

`invocable`은 `std::invoke` 방식으로 호출할 수 있는지를 검사한다.
일반 함수 객체뿐 아니라 멤버 함수 포인터도 같은 틀에 들어온다.
`regular_invocable`은 같은 입력에 대한 안정된 결과와 부작용 관련 의미 요구를 더한다.
두 개의 문법 검사가 사실상 같아도 의미 계약은 다를 수 있다.

`predicate`는 호출 결과가 조건으로 해석될 수 있어야 한다.
`relation`, `equivalence_relation`, `strict_weak_order`는 두 입력의 관계를 표현한다.
상태를 바꾸며 비교 결과를 뒤집는 함수는 호출은 가능해도 정렬 비교자로 부적절하다.

간접 호출 콘셉트는 반복자를 역참조해서 얻는 값과 참조 조합에 적용된다.
여기에 projection을 더하면 객체 전체 대신 키를 비교하도록 알고리즘을 구성할 수 있다.
내부적으로 프록시가 있으면 호출자의 단순 타입 추정과 다른 조건이 나타날 수 있다.

## 5.5 보조 콘셉트를 읽는 법

표준 문서에는 설명 전용 콘셉트도 등장한다.
이름이 보인다고 사용자 코드에서 `std::` 아래의 공개 API로 호출할 수 있는 것은 아니다.
정수와 비슷한 타입, 불리언으로 검사 가능한 결과, 증가 가능한 타입 등이 보조 조건으로 쓰인다.

`weakly_incrementable`과 `incrementable`도 같은 의미가 아니다.
여러 번 읽고 증가시켜도 되는 안정된 반복자의 성질과 단일 통과 입력의 성질을 구분한다.
새 반복자를 설계할 때는 필요한 연산자 목록과 의미적 보장을 함께 기록한다.

## 복습 질문

1. `movable`은 만족하지만 `copyable`은 만족하지 않는 자원 타입을 설명할 수 있는가?
2. `sized_range`만으로 `ranges::sort`를 호출할 수 없는 이유는 무엇인가?
3. `invocable`과 `regular_invocable`의 차이를 컴파일러가 모두 검사하는가?
4. 필요한 기능이 `input_range`뿐인데 `random_access_range`를 요구하면 어떤 사용자를 잃는가?

규칙은 [표준 콘셉트 절](https://eel.is/c++draft/concepts)과 [범위 요구사항](https://eel.is/c++draft/range.req)으로 확인했다. 링크는 최신 초안이므로 이 글에서는 C++20에 속한 콘셉트만 선택했다.

예제의 실행 검증 여부는 시리즈 통합 검증 기록을 따른다.
