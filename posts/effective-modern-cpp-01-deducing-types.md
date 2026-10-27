---
title: "01: 타입 추론"
description: "Item 1–4. 템플릿, auto, decltype의 추론 규칙과 확인 방법을 공부합니다."
date: "2026-10-27"
order: 1
category: "C++"
subcategory: "Effective Modern C++"
tags: ["C++","Effective Modern C++","타입 추론","decltype"]
image: ""
readingTime: ""
featured: false
draft: false
aiGenerated: false
---
공개된 [공식 목차](https://www.oreilly.com/library/view/effective-modern-c/9781491908419/)의 1장, Item 1–4 순서로 공부한다. 책 전체 본문의 번역이 아니라 언어 규칙과 직접 만든 예제를 연결한 개인 학습 노트다. 기준은 C++11/14이며 현재 작업 초안의 이후 기능과 구분한다.

## Item 1. 템플릿 타입 추론을 세 가지 경우로 나누기

매개변수의 선언 모양부터 읽는다. `T`, `T&`, `T&&`는 같은 인수에서 서로 다른 결과를 만든다. `T` 자체와 최종 매개변수 타입도 구분해야 한다.

```cpp
#include <type_traits>

template<class T> void byValue(T value) {
    static_assert(std::is_same<T, int>::value, "int");
    (void)value;
}
template<class T> void byReference(T& value) {
    static_assert(std::is_same<T, const int>::value, "const int");
    (void)value;
}
void example() {
    const int count = 12;
    byValue(count);      // T = int, 별개의 값
    byReference(count);  // T = const int, 매개변수는 const int&
}
```

값 매개변수에서는 참조와 최상위 const가 사라진다. 포인터가 가리키는 대상의 const까지 없애는 것은 아니다. `const int*`를 값으로 전달하면 포인터는 복사되지만 대상은 계속 읽기 전용이다.

참조 매개변수는 원본을 참조하므로 대상의 const를 보존한다. 배열도 참조로 받으면 크기 정보가 남지만 값으로 받으면 보통 포인터로 조정된다. 함수 인수도 값 문맥에서 함수 포인터로 조정된다.

```cpp
#include <cstddef>

template<class T, std::size_t N>
constexpr std::size_t extent(T (&)[N]) { return N; }

int samples[5] = {};
static_assert(extent(samples) == 5, "배열 크기 보존");
```

추론되는 `T&&`에는 특별 규칙이 적용된다. lvalue를 넘기면 T가 lvalue 참조로 추론되고 참조 축약 후 매개변수도 lvalue 참조가 된다. 구체적인 타입의 `int&&`와는 다르다. 자세한 전달 규칙은 5장에서 다시 다룬다. [함수 호출의 템플릿 추론](https://eel.is/c++draft/temp.deduct.call)

**주의:** 값 전달이 언제나 깊은 복사라는 뜻은 아니다. 포인터와 뷰를 복사하면 여전히 같은 외부 객체를 볼 수 있다.

## Item 2. auto는 선언에 붙인 참조와 초기화 문법까지 읽기

```cpp
#include <initializer_list>

const int limit = 30;
auto copy = limit;         // int
const auto& view = limit; // const int&
auto values = {2, 4, 6};  // initializer_list<int>
```

일반적인 auto 변수 추론은 템플릿 추론과 비슷하다. 그러나 `auto values = {…}`는 초기화 목록을 특별 취급한다. 모든 원소로 일관된 원소 타입을 얻을 수 있어야 한다.

`auto x{1}`의 규칙에는 결함 수정이 적용되었다. 수정된 규칙에서는 int이고, `auto x = {1}`은 initializer_list다. 오래된 C++11 설명과 오늘의 C++11 모드 결과가 다를 수 있다. 중괄호를 한 가지 스타일로 일괄 치환하지 않는다.

C++14의 반환 타입 auto와 제네릭 람다의 auto 매개변수는 일반 템플릿 추론처럼 동작한다. `return {1, 2};`만으로 함수 반환 타입을 추론할 수는 없다. [auto 명세](https://eel.is/c++draft/dcl.spec.auto)

**내 판단 기준:** 복사본이면 auto, 별칭이면 auto&, 읽기 전용 별칭이면 const auto&를 먼저 검토한다. 임시 객체와 프록시는 추가로 확인한다.

## Item 3. decltype은 선언된 타입과 표현식의 값 범주를 구분하기

```cpp
#include <type_traits>

int points = 7;
decltype(points) independent = points; // int
decltype((points)) alias = points;      // int&
static_assert(std::is_same<decltype(alias), int&>::value, "참조");
```

괄호 없는 이름이나 멤버 접근에는 선언된 타입을 얻는 특별 규칙이 있다. 그 밖의 표현식에는 lvalue면 T&, xvalue면 T&&, prvalue면 T를 얻는다. 따라서 괄호가 단순한 장식이 아니다.

C++14의 `decltype(auto)`는 decltype 규칙으로 반환 타입까지 보존할 수 있다.

```cpp
#include <vector>

decltype(auto) first(std::vector<int>& values) {
    return values.front(); // int&
}
```

이 함수는 비어 있지 않은 벡터를 요구하고, 반환 참조는 원본 원소가 유효한 동안에만 사용할 수 있다. 반환 타입 보존이 수명 보장까지 제공하지 않는다.

특히 지역 변수 `local`을 `return (local);`로 반환하는 decltype(auto) 함수는 끊긴 참조를 만들 수 있다. 값을 반환하려는 함수에서는 무조건 decltype(auto)를 사용하는 습관을 피한다. [decltype 규칙](https://eel.is/c++draft/dcl.type.decltype)

## Item 4. 추론 결과를 도구로 확인하기

IDE 표시와 오류 메시지는 첫 단서다. 런타임 `typeid(...).name()`은 구현에 따라 표현이 다르고 참조·최상위 const가 드러나지 않을 수 있으므로 최종 검증으로 쓰기 어렵다.

```cpp
#include <type_traits>

const int source = 9;
auto result = source;
static_assert(std::is_same<decltype(result), int>::value,
              "result는 독립적인 int");
static_assert(std::is_same<decltype((source)), const int&>::value,
              "괄호 친 source는 const lvalue");
```

의도한 타입을 static_assert로 표현하면 컴파일러나 라이브러리 변경 때도 가정이 유지되는지 확인할 수 있다. 실제 템플릿 함수 안에서 T와 decltype(parameter)를 각각 조사하면 추론과 참조 축약을 분리해서 이해하기 좋다.

학습 실험에서는 의도적으로 정의하지 않은 타입 템플릿을 인스턴스화해 진단에 타입을 출력할 수도 있다. 다만 오류를 이용하는 실험 코드를 제품 코드에 남기지는 않는다.

## 복습 메모

- 값 전달에서 사라지는 const와 포인터 대상의 const를 구별한다.
- 배열 크기를 보존하려면 어떤 매개변수 선언이 필요한지 적어 본다.
- auto의 목록 초기화 예외와 decltype의 괄호 규칙을 따로 기억한다.
- 참조 타입을 얻었다면 원본의 수명과 무효화 조건도 확인한다.

## 참고와 다음 글

[저자의 도서 안내](https://www.aristeia.com/EMC%2B%2B.html)는 책의 범위를 확인하는 자료다. 위 작업 초안은 갱신되는 현재 문서이며 C++11/14 이후 문법을 포함할 수 있다. 예제는 독립적인 학습용 선언·함수 조각이다. 실행하려면 필요한 main과 호출부를 별도로 구성한다.

[시리즈 개요](/?post=effective-modern-cpp-overview) · [다음: auto](/?post=effective-modern-cpp-02-auto)
