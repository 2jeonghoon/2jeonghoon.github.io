---
title: "19: 비타입 템플릿 매개변수 확장"
description: "부동소수점, 구조적 클래스와 캡처 없는 람다를 값 템플릿 인자로 사용하는 규칙을 공부합니다."
date: "2026-10-19"
order: 19
category: "C++"
subcategory: "C++20 — The Complete Guide"
tags: ["C++", "C++20", "NTTP", "Templates", "Structural Type"]
image: ""
readingTime: ""
featured: false
draft: true
aiGenerated: true
---

[전체 학습 지도](/?post=cpp20-complete-guide-overview)

이 글은 『C++20 — The Complete Guide』의 [공개 공식 목차](https://leanpub.com/cpp20)와 [저자 예제 목록](https://www.cppstd20.com/code/toc.html)을 학습 순서의 기준으로 삼은 개인 공부 초안이다. 접근하지 못한 책 전체 본문을 읽고 요약했다는 뜻은 아니다. 언어와 라이브러리 규칙을 1차 자료로 확인하고, 설명과 예제는 독립적으로 재구성했다. 각 코드 블록은 서로 별개이며, 일부 코드 조각은 문맥을 함께 표시한다.

## 19.1 타입 대신 값을 전달하는 설계

비타입 템플릿 매개변수는 배열 크기처럼 컴파일 시점 정책을 타입의 일부로 만드는 수단이다.
C++20에서는 허용되는 타입 범위가 넓어져 부동소수점과 일정 조건의 클래스 값도 사용할 수 있다.
값이 달라지면 별도 템플릿 인스턴스가 생길 수 있으므로 코드 크기와 컴파일 비용을 고려한다.

일반 함수 인자는 실행 중 값을 바꿀 수 있고, 템플릿 인자는 인스턴스의 정체성을 결정한다.
설정값을 무조건 템플릿에 올리기 전에 이 차이가 실제 설계에 필요한지 판단한다.
예를 들어 사용자 파일에서 읽는 임계값은 대개 실행 중 데이터다.

### 19.1.1 부동소수점 값

```cpp
#include <cassert>

template<double Scale>
constexpr double convert(double value) {
    return value * Scale;
}

int main() {
    static_assert(convert<0.5>(8.0) == 4.0);
    assert(convert<2.0>(3.5) == 7.0);
}
```

언어가 이 형식을 허용한다는 사실과 특정 컴파일러의 구현 지원은 별도다.
십진수 표기와 이진 부동소수점 표현의 차이도 없어지지 않는다.
특수화를 구별할 때 일반 실행 중의 근사 비교 함수를 사용하는 것은 아니다.

계산 오차 때문에 사실상 같은 정책이 다른 인스턴스를 만들지 않게, 필요하다면 정수 비율이나 별도 정책 타입을 사용한다.
부동소수점 템플릿 인자는 수치 모델을 신중하게 선택했을 때 유용한 도구다.

### 19.1.2 구조적 클래스 값

리터럴 클래스라고 모두 허용되는 것은 아니다.
구조적 타입이 되려면 기반과 비정적 데이터 멤버의 접근성, mutable 여부, 멤버 타입 등에 대한 요구를 만족해야 한다.
문자열을 담고 싶다면 동적 메모리를 소유하는 string보다 문자 배열로 된 작은 구조를 고려한다.

```cpp
#include <cstddef>
#include <string_view>

// 공개 비mutable 문자 배열을 가진 구조적 타입
// 각 문자열 길이가 타입에 나타난다.
template<std::size_t N>
struct Label {
    char text[N];
    constexpr Label(const char (&input)[N]) {
        for (std::size_t i = 0; i < N; ++i) text[i] = input[i];
    }
};

template<Label Name>
struct Channel {
    static constexpr std::string_view name() {
        return {Name.text, sizeof(Name.text) - 1};
    }
};

static_assert(Channel<"audit">::name() == "audit");
int main() {}
```

문자열 리터럴의 주소를 포인터 템플릿 인자로 곧바로 전달하는 것과 이 예제는 다르다.
여기서는 문자들이 클래스 값에 복사되고 그 값이 템플릿 인자가 된다.
배열 끝의 널 문자를 제외해 view 길이를 계산한다.

### 템플릿 매개변수 객체의 수명과 동일성

클래스 타입의 템플릿 매개변수는 언어가 정한 매개변수 객체로 다뤄진다.
이 예제에서 `Name.text`에 대한 view는 생성자의 지역 배열을 빌리는 것이 아니다.
대신 임의의 지역 객체를 가리키는 포인터 멤버까지 같은 방식으로 허용된다고 확장하면 안 된다.

템플릿 인자의 동등성은 구조와 언어 규칙으로 정해진다.
사용자 정의 `operator==`를 임의로 작성해 인스턴스의 정체성을 바꾸는 기능으로 생각하지 않는다.
정보 은닉이 필요한 일반 업무 객체 전체를 그대로 구조적 타입으로 만들 필요도 없다.

### 19.1.3 람다를 값 정책으로 전달하기

```cpp
#include <cassert>

template<auto Predicate>
constexpr bool accepts(int value) { return Predicate(value); }

int main() {
    static_assert(accepts<[](int n) { return n >= 0; }>(3));
    assert(!accepts<[](int n) { return n % 2 == 0; }>(3));
}
```

캡처 없는 클로저는 이 용도로 쓸 수 있지만 캡처가 있는 람다는 같은 구조적 타입 규칙을 만족하지 않는다.
여러 곳에서 동일 정책의 같은 인스턴스를 공유하고 싶다면 하나의 이름 있는 constexpr 람다를 재사용하는 방식을 검토한다.
소스에 똑같은 람다 본문을 반복했다고 타입이 같아지지는 않는다.

## 19.2 적용 전 확인할 것과 복습 질문

- 이 설정을 바꾸면 실행 중 데이터만 달라져야 하는가, 타입도 달라져야 하는가?
- 구조적 타입의 멤버가 모두 요구 조건을 만족하는가?
- 포인터나 참조 멤버가 허용되지 않는 저장소를 가리키지 않는가?
- 값의 다양성이 템플릿 인스턴스 수를 지나치게 늘리지 않는가?

작은 정책 값과 짧은 식별자를 타입 수준으로 올리는 용도를 먼저 연습한다.
그 뒤 실제 프로젝트에서는 빌드 시간, 오류 메시지, ABI에 드러나는 타입 복잡성을 함께 비교한다.

## 복습에 사용한 1차 자료

- [C++20 초안 N4861: 템플릿 매개변수와 구조적 타입](https://timsong-cpp.github.io/cppwp/n4861/temp.param)
- [C++20 초안 N4861: 비타입 템플릿 인자](https://timsong-cpp.github.io/cppwp/n4861/temp.arg.nontype)
- [C++20 초안 N4861: 람다 클로저 타입](https://timsong-cpp.github.io/cppwp/n4861/expr.prim.lambda.closure)
