---
title: "22: 제네릭 프로그래밍의 작은 개선"
description: "typename 생략이 가능한 문맥, aggregate CTAD와 조건부 explicit의 의미를 공부합니다."
date: "2026-10-19"
order: 22
category: "C++"
subcategory: "C++20 — The Complete Guide"
tags: ["C++", "C++20", "Templates", "CTAD", "explicit"]
image: ""
readingTime: ""
featured: false
draft: true
aiGenerated: true
---

[전체 학습 지도](/?post=cpp20-complete-guide-overview)

이 글은 『C++20 — The Complete Guide』의 [공개 공식 목차](https://leanpub.com/cpp20)와 [저자 예제 목록](https://www.cppstd20.com/code/toc.html)을 학습 순서의 기준으로 삼은 개인 공부 초안이다. 접근하지 못한 책 전체 본문을 읽고 요약했다는 뜻은 아니다. 언어와 라이브러리 규칙을 1차 자료로 확인하고, 설명과 예제는 독립적으로 재구성했다. 각 코드 블록은 서로 별개이며, 일부 코드 조각은 문맥을 함께 표시한다.

## 22.1 의존 이름과 암시적 typename

템플릿에서 `T::value_type` 같은 의존 이름은 실제 T가 정해지기 전까지 타입인지 값인지 모를 수 있다.
C++20에서는 타입만 올 수 있다고 정해진 일부 문맥에서 `typename`을 생략할 수 있다.
모든 위치에서 typename이 불필요해진 것은 아니다.

```cpp
#include <vector>
#include <type_traits>

template<class T>
using element_t = T::value_type; // 별칭 선언의 타입 문맥

template<class T>
T::value_type first(const T& values) { // 반환 타입 문맥
    typename T::value_type result = values.front();
    return result;
}

static_assert(std::is_same_v<element_t<std::vector<int>>, int>);
int main() { return first(std::vector<int>{0}); }
```

같은 타입 이름이라도 함수 본문에서 지역 변수를 선언하는 문맥에는 여전히 `typename`을 적는 것이 필요할 수 있다.
컴파일러가 뒤의 토큰을 끝까지 보고 임의로 추측하는 규칙이 아니라, 언어가 정한 문맥 규칙이다.
코드 스타일에서 일관되게 명시하는 선택도 가능하다.

### 22.1.1 생략 규칙을 읽는 방법

문장을 볼 때 먼저 그 위치에 표현식도 올 수 있는지를 묻는다.
타입만 가능한 문맥과 선언·표현식 해석이 경합하는 문맥을 구분하면 규칙을 외우기 쉽다.
멤버 템플릿 호출의 `template` 구분자는 typename과 다른 문제이므로 섞지 않는다.

생략이 허용된다는 이유로 모든 기존 typename을 기계적으로 지우지 않는다.
여러 언어 버전을 지원하는 헤더라면 최소 버전도 함께 고려한다.
규칙 변경은 간결함을 주지만 의존 이름 자체의 지연 검사까지 없애지는 않는다.

## 22.2 aggregate를 제네릭 코드에서 사용하기

aggregate를 괄호로 초기화할 수 있게 되면 `T(args...)` 형태를 쓰는 일부 제네릭 구성 코드와 더 잘 맞는다.
클래스 템플릿 인자 추론도 aggregate 멤버 구조를 활용할 수 있다.
별도 deduction guide 없이 간단한 자료 묶음을 선언하는 경우가 대표적이다.

```cpp
#include <type_traits>
#include <string_view>

// 사용자 선언 생성자나 deduction guide가 없는 aggregate
template<class Key, class Value>
struct Record {
    Key key;
    Value value;
};

int main() {
    Record record{7, std::string_view{"ready"}};
    static_assert(std::is_same_v<decltype(record), Record<int, std::string_view>>);
}
```

추론은 사용자가 원하는 소유권을 알아맞히지 않는다.
문자열 리터럴, 배열, 참조와 중괄호의 형태에 따라 결과가 달라질 수 있으므로 중요한 경계에서는 타입을 확인한다.
예제는 문자열의 소유권이 필요 없는 고정 리터럴이라 string_view를 명시했다.

### 22.2.1 CTAD를 적용할 때의 함정

멤버 구조를 바꾸면 같은 초기화 식의 추론 결과가 달라질 수 있다.
사용자 선언 deduction guide가 존재하는 경우도 단순 aggregate 추론과 같은 상황으로 가정하지 않는다.
공개 라이브러리에서는 추론 동작도 사용자가 의존하는 인터페이스다.

괄호 aggregate 초기화가 가능해져도 모든 제네릭 팩터리와 완벽하게 호환되는 것은 아니다.
중괄호만 제공하는 축소 변환 검사나 참조의 수명 차이를 검토한다.
가독성을 위해 named member 초기화를 쓰고 싶다면 지정 초기화 조건도 따로 충족해야 한다.

## 22.3 조건부 explicit

래퍼가 기반 타입의 변환 정책을 보존하려면 생성자가 어떤 경우에만 explicit인지 표현해야 한다.
이전에는 여러 오버로드와 조건부 활성화로 나눴지만 `explicit(condition)`은 그 정책을 한 선언에 적는다.
조건은 컴파일 시점 bool이며 참이면 명시적 생성만 허용한다.

```cpp
#include <type_traits>
#include <utility>

struct StrongNumber {
    explicit StrongNumber(int) {}
};

template<class T>
class Box {
    T value_;
public:
    template<class U>
        requires std::is_constructible_v<T, U&&>
    explicit(!std::is_convertible_v<U&&, T>)
    Box(U&& value) : value_(std::forward<U>(value)) {}
};

static_assert(std::is_convertible_v<int, Box<int>>);
static_assert(!std::is_convertible_v<int, Box<StrongNumber>>);
static_assert(std::is_constructible_v<Box<StrongNumber>, int>);
int main() { Box<StrongNumber> value{3}; }
```

`requires`는 생성 가능성을, 조건부 explicit은 암시적 변환 허용 여부를 정한다.
둘 중 하나가 다른 하나를 대신하지 않는다.
래퍼에 전송 생성자를 추가할 때는 복사·이동 생성자를 가로채는지까지 확인한다.

### 표준 라이브러리와 연결하기

pair, tuple 같은 래퍼의 변환에서도 원소 타입의 암시적 변환 정책이 중요하다.
사용자는 내부 생성자의 구현보다 복사 초기화와 직접 초기화가 왜 다른 결과를 내는지 이해하면 된다.
타입 특성과 조건부 explicit을 같이 읽는 연습이 표준 인터페이스 이해에 도움이 된다.

## 22.4 복습 질문

- 이 위치가 타입만 가능한 문맥인지 설명할 수 있는가?
- aggregate CTAD로 얻은 타입이 실제 소유권 의도와 같은가?
- 생성 가능하지만 암시적 변환은 불가능한 경우를 구별하는가?
- 전송 생성자가 기존 복사·이동 인터페이스를 방해하지 않는가?

## 복습에 사용한 1차 자료

- [C++20 초안 N4861: 의존 타입 이름](https://timsong-cpp.github.io/cppwp/n4861/temp.res)
- [C++20 초안 N4861: 클래스 템플릿 인자 추론](https://timsong-cpp.github.io/cppwp/n4861/over.match.class.deduct)
- [C++20 초안 N4861: explicit 지정자](https://timsong-cpp.github.io/cppwp/n4861/dcl.fct.spec)
