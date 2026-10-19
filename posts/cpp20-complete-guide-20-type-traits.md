---
title: "20: 새 타입 특성 도구"
description: "배열 분류, 변환 검사, 공통 참조, iterator 특성과 레이아웃 검사 범위를 공부합니다."
date: "2026-10-19"
order: 20
category: "C++"
subcategory: "C++20 — The Complete Guide"
tags: ["C++", "C++20", "Type Traits", "Generic Programming"]
image: ""
readingTime: ""
featured: false
draft: true
aiGenerated: true
---

[전체 학습 지도](/?post=cpp20-complete-guide-overview)

이 글은 『C++20 — The Complete Guide』의 [공개 공식 목차](https://leanpub.com/cpp20)와 [저자 예제 목록](https://www.cppstd20.com/code/toc.html)을 학습 순서의 기준으로 삼은 개인 공부 초안이다. 접근하지 못한 책 전체 본문을 읽고 요약했다는 뜻은 아니다. 언어와 라이브러리 규칙을 1차 자료로 확인하고, 설명과 예제는 독립적으로 재구성했다. 각 코드 블록은 서로 별개이며, 일부 코드 조각은 문맥을 함께 표시한다.

## 20.1 배열을 더 정확히 분류하기

`is_bounded_array`는 크기가 알려진 배열, `is_unbounded_array`는 미지정 길이 배열을 구별한다.
포인터와 배열이 함수 인자 전달 과정에서 비슷하게 보이더라도 같은 타입은 아니다.
타입 특성을 적용하기 전에 이미 decay가 일어났는지 확인한다.

```cpp
#include <type_traits>

static_assert(std::is_bounded_array_v<int[4]>);
static_assert(std::is_unbounded_array_v<int[]>);
static_assert(!std::is_bounded_array_v<int*>);
static_assert(!std::is_array_v<std::decay_t<int[4]>>);
int main() {}
```

길이를 활용하려는 인터페이스가 값을 받아 버리면 배열 크기를 잃을 수 있다.
배열 참조 매개변수나 span 등 목적에 맞는 인터페이스와 함께 사용한다.
특성 하나가 호출 규약의 정보 손실을 되돌려 주지는 않는다.

## 20.2 예외 없는 암시적 변환 검사

`is_convertible`은 암시적으로 변환 가능한지를 묻는다.
`is_nothrow_convertible`은 그 변환이 예외를 던지지 않는 조건까지 검사한다.
명시적 생성만 허용하는 타입을 검사하려면 다른 특성이 필요할 수 있다.

```cpp
#include <type_traits>

struct Token {
    Token(int) noexcept {}
};
struct ExplicitToken {
    explicit ExplicitToken(int) noexcept {}
};
static_assert(std::is_nothrow_convertible_v<int, Token>);
static_assert(!std::is_convertible_v<int, ExplicitToken>);
static_assert(std::is_nothrow_constructible_v<ExplicitToken, int>);
int main() {}
```

타입이 불완전한 시점에서 특성 결과가 정의 이후 달라질 수 있는 검사를 무심코 수행하지 않는다.
특성의 입력 타입에 대한 전제 조건도 인터페이스 계약에 포함된다.

## 20.3 타입을 정리하고 연결하기

`remove_cvref_t<T>`는 참조와 최상위 cv 한정을 제거한다.
`decay_t<T>`처럼 배열을 포인터로 바꾸거나 함수 타입을 함수 포인터로 바꾸지는 않는다.
수신 객체의 기본 타입을 조사하는 경우와 값 전달 효과를 흉내 내는 경우를 구별한다.

```cpp
#include <functional>
#include <type_traits>

static_assert(std::is_same_v<std::remove_cvref_t<const int&>, int>);
static_assert(std::is_same_v<std::remove_cvref_t<int(&)[3]>, int[3]>);
static_assert(std::is_same_v<std::unwrap_reference_t<std::reference_wrapper<int>>, int&>);
static_assert(std::is_same_v<std::unwrap_ref_decay_t<const int&>, int>);
static_assert(std::is_same_v<std::common_reference_t<int&, const int&>, const int&>);
int main() {}
```

`unwrap_reference`는 reference_wrapper를 실제 참조 타입으로 풀고, `unwrap_ref_decay`는 decay와 이 변환을 결합한다.
컨테이너 원소를 소유하는 설계에서 참조로 풀린 결과를 저장하면 외부 수명에 의존하게 된다.
타입 연산도 소유권 계약을 바꿀 수 있다는 점을 기억한다.

### common_reference와 type_identity

`common_reference_t`는 여러 타입이 함께 참조될 수 있는 결과를 표현하는 데 중요하다.
`common_type_t`와 항상 같은 답을 내는 것이 아니며, iterator의 값·참조 관계를 설명할 때 쓰인다.
프록시 참조 타입을 설계할 때도 이 관계가 개념 제약에 영향을 준다.

```cpp
#include <type_traits>
#include <cassert>

template<class T>
T add(T first, std::type_identity_t<T> second) { return first + second; }

int main() {
    assert(add(3, 2.5) == 5); // T는 첫 인자에서 int로 추론, 둘째는 변환
}
```

`type_identity_t`는 결과 타입을 바꾸지 않으면서 추론하지 않는 문맥을 만들 수 있다.
위 예제는 편리함과 함께 축소·잘림 가능성도 드러낸다.
추론 충돌을 없앤다는 이유만으로 의도하지 않은 변환까지 허용하지 않는다.

## 20.4 iterator 관련 타입

`iter_difference_t<I>`는 거리 차이를 나타내는 타입이고 `iter_value_t<I>`는 값 타입이다.
`iter_reference_t<I>`는 역참조 식의 결과 타입이므로 반드시 `value_type&`일 필요가 없다.
`iter_rvalue_reference_t<I>`는 `ranges::iter_move`를 통한 이동 접근의 결과를 반영한다.

프록시 iterator를 지원하려면 함수가 무조건 실제 참조를 반환한다고 가정하지 않는다.
이름만 보고 타입을 손으로 조합하기보다 표준 별칭과 관련 개념을 함께 사용한다.
컨테이너의 값 타입과 읽기 식의 타입을 별도로 적어 보는 연습이 유용하다.

## 20.5 레이아웃 호환성과 포인터 상호 변환

`is_layout_compatible`은 언어가 정의한 레이아웃 호환 관계를 검사한다.
`is_pointer_interconvertible_base_of` 등은 기반·멤버와 객체 주소 관계를 더 좁은 규칙으로 다룬다.
`is_corresponding_member`는 두 멤버가 대응하는지, `is_pointer_interconvertible_with_class`는 해당 멤버의 주소 관계를 검사한다.

검사가 참이라고 임의의 타입 별칭 접근이나 객체 수명 시작이 모두 허용되는 것은 아니다.
레이아웃, strict aliasing, 객체 수명, 정렬은 서로 다른 조건이다.
파일 포맷이나 네트워크 패킷을 구조체로 무조건 재해석하는 면허로 사용하지 않는다.

## 20.6 복습 질문

- remove_cvref와 decay가 배열에 내는 결과는 어떻게 다른가?
- 암시적 변환 가능성과 명시적 생성 가능성을 구별하는가?
- iterator의 reference 타입이 실제 참조가 아닐 수 있는가?
- 레이아웃 검사 이후에도 남아 있는 객체 모델 조건은 무엇인가?

## 복습에 사용한 1차 자료

- [C++20 초안 N4861: 타입 특성](https://timsong-cpp.github.io/cppwp/n4861/meta)
- [C++20 초안 N4861: iterator 관련 타입](https://timsong-cpp.github.io/cppwp/n4861/iterator.assoc.types)
- [C++20 초안 N4861: 레이아웃 관계 검사](https://timsong-cpp.github.io/cppwp/n4861/meta.rel)
