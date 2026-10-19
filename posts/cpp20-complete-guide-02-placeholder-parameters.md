---
title: "02: 함수 매개변수의 플레이스홀더 타입"
description: "auto 매개변수가 만드는 축약 함수 템플릿과 추론의 경계를 정리한다."
date: "2026-10-19"
order: 2
category: "C++"
subcategory: "C++20 — The Complete Guide"
tags: ["C++", "C++20", "auto", "Templates"]
image: ""
readingTime: ""
featured: false
draft: true
aiGenerated: true
---

[시리즈 학습 지도](/?post=cpp20-complete-guide-overview)

이 글은 [공식 목차](https://leanpub.com/cpp20)와 [저자 공개 자료](https://www.cppstd20.com/code/toc.html)로 학습 순서를 정하고 표준 언어 규칙으로 재구성한 노트다. 비공개 본문의 번역이나 완전 요약이 아니며 예제는 새로 작성했다.

## 2.1 일반 함수 매개변수에도 auto를 쓴다

C++20의 `auto` 매개변수는 실행 중 아무 타입이나 담는 상자가 아니다.
각 호출에서 타입을 추론하는 함수 템플릿의 축약 표기다.
매개변수마다 독립적인 템플릿 타입 매개변수가 만들어진다고 읽으면 좋다.

아래는 독립 실행 예제다.

```cpp
#include <cassert>
#include <string>

auto twice(const auto& value) {
    return value + value;
}

struct Multiplier {
    int factor;
    auto apply(auto value) const { return value * factor; }
};

int main() {
    assert(twice(7) == 14);
    assert(twice(std::string{"ha"}) == "haha");
    assert(Multiplier{3}.apply(4) == 12);
}
```

멤버 함수에도 쓸 수 있지만 그 함수 역시 템플릿이다.
따라서 가상 함수로 만드는 등의 비템플릿 함수 전용 기능과 조합할 수 없다.
공개 인터페이스에서 사용하면 헤더에 정의를 두는 전통적인 템플릿 배포 문제도 남는다.

## 2.2 실무에서 타입 생략을 선택하는 기준

타입 이름보다 연산이 중요한 짧은 알고리즘에 축약 표기가 어울린다.
그러나 매개변수 타입을 생략하면 진단 시점도 템플릿 인스턴스화 이후로 밀릴 수 있다.
위 함수에 더하기가 없는 타입을 넘기면 본문에서 오류가 난다.
호출 후보 선정 단계에서 제외하려면 다음 장의 제약을 붙여야 한다.

`auto` 함수와 제네릭 람다는 모두 타입을 추론하지만 사용 문맥은 다르다.
이름 있는 함수는 재귀와 오버로드 집합 구성에 자연스럽다.
람다는 지역 캡처와 알고리즘 콜백에 자연스럽다.
타입 생략만을 이유로 모든 함수를 람다 변수로 바꿀 필요는 없다.

다음은 함수 선언 조각이다.

```cpp
auto combine(auto left, auto right) { return left + right; }

template<class T>
auto combine_same(T left, T right) { return left + right; }
```

첫 함수의 두 매개변수는 서로 다른 타입이어도 된다.
두 번째 함수는 두 인수에서 추론한 `T`가 일치해야 한다.
`combine(1, 2.5)`와 `combine_same(1, 2.5)`는 같은 인터페이스가 아니다.
필요한 관계가 있다면 생략하지 말고 타입 매개변수로 표현한다.

## 2.3 추론 규칙과 제약을 자세히 보기

`auto value`는 값 매개변수이므로 복사 비용과 배열의 포인터 변환을 고려한다.
`const auto& value`는 복사를 피하지만 원본 수명에 의존한다.
`auto&& value`는 추론 문맥에서 전달 참조가 되며 lvalue도 받을 수 있다.
이름을 가진 매개변수는 본문에서 lvalue 표현식이라는 점은 바뀌지 않는다.

전달하려면 타입에 따라 값 범주를 복원해야 한다. 아래는 함수 정의 조각이다.

```cpp
#include <utility>

auto relay(auto&& callable, auto&& argument)
    -> decltype(auto)
{
    return std::forward<decltype(callable)>(callable)(
        std::forward<decltype(argument)>(argument));
}
```

반환 `auto`는 보통 참조를 제거한다.
`decltype(auto)`는 참조 반환도 보존하므로 호출자가 수명을 더 주의해야 한다.
축약 매개변수와 반환 타입 추론은 별개의 규칙이다.

명시적인 템플릿 매개변수와 `auto` 매개변수를 혼합할 수도 있다.
이 경우 생략된 매개변수용 타입 매개변수는 명시한 매개변수 뒤에 붙는다.
독자가 매개변수 사이의 관계를 읽기 어렵다면 축약하지 않는 편이 낫다.

`decltype(auto)`를 일반 함수 매개변수 타입으로 대신 쓰는 것은 허용되지 않는다.
또한 `{1, 2, 3}` 같은 타입 없는 중괄호 목록은 일반적인 `auto` 매개변수에서 그대로 추론되지 않는다.
필요하면 `std::initializer_list<T>`나 명시적인 컨테이너를 사용한다.

## 2.4 복습과 적용 판단

1. 두 `auto` 매개변수가 같은 타입이어야 한다면 어떤 선언이 더 정확한가?
2. `auto&&` 매개변수 이름을 그대로 다른 함수에 전달하면 이동되는가?
3. 값 반환이 안전한 인터페이스에 `decltype(auto)`를 붙이면 무엇이 달라지는가?
4. 템플릿 오류를 호출 경계에서 설명하려면 어떤 제약이 필요한가?

내 코드에서는 작은 지역 알고리즘부터 축약 표기를 적용한다.
타입 관계, 소유권, 반환 수명을 숨기게 되는 경우에는 명시적 선언을 유지한다.

추론의 근거는 [플레이스홀더 타입 규칙](https://eel.is/c++draft/dcl.spec.auto)이다. 현재 작업 초안의 이후 버전 기능은 제외하고 C++20의 축약 함수 템플릿만 다뤘다.

예제의 실행 검증 여부는 시리즈 통합 검증 기록을 따른다.
