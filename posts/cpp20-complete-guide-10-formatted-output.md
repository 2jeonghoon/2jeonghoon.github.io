---
title: "10: 형식화된 출력"
description: "format 함수 계열, 형식 지정, 로캘과 사용자 formatter를 공부한다."
date: "2026-10-19"
order: 10
category: "C++"
subcategory: "C++20 — The Complete Guide"
tags: ["C++", "C++20", "format", "Formatting"]
image: ""
readingTime: ""
featured: false
draft: true
aiGenerated: true
---

[시리즈 학습 지도](/?post=cpp20-complete-guide-overview)

[공식 목차](https://leanpub.com/cpp20)와 [저자 공개 예제 목록](https://www.cppstd20.com/code/toc.html)을 따라 표준 기능을 학습용으로 재구성한 노트다. 비공개 책 본문을 읽고 옮긴 요약은 아니다. 예제는 별도로 작성했다.

## 10.1 예제로 형식화 함수 둘러보기

`std::format`은 형식 문자열과 타입을 가진 인수에서 문자열을 만든다.
스트림의 상태를 연속해서 조절하는 대신 출력 모양을 한 문자열에 표현한다.
printf 계열과 달리 인수는 일반적인 C++ 타입을 유지한다.
하지만 임의의 모든 사용자 타입이 자동 지원되는 것은 아니다.

아래는 독립 실행 예제다.

```cpp
#include <cassert>
#include <format>
#include <iterator>
#include <string>

int main() {
    auto label = std::format("job={:04d}, ratio={:.1f}", 7, 0.26);
    assert(label == "job=0007, ratio=0.3");

    std::string output;
    std::format_to(std::back_inserter(output), "{}:{}", "port", 8080);
    assert(output == "port:8080");

    char short_buffer[4]{};
    auto result = std::format_to_n(short_buffer, 3, "{}", "abcdef");
    assert(result.size == 6);
    assert(short_buffer[0] == 'a' && short_buffer[2] == 'c');
    assert(std::formatted_size("{}:{}", "port", 8080) == output.size());
}
```

`format_to`는 출력 반복자에 기록한다.
출력 저장소가 충분한지의 보장은 목적지 반복자와 호출자가 책임진다.
`back_inserter`를 쓰면 문자열 확장을 이용할 수 있다.

`format_to_n`은 최대 n개까지만 기록하고 전체 결과에 필요한 길이도 반환한다.
자동 널 종료를 하지 않으므로 C 문자열이 필요하면 별도 공간과 종료 문자를 준비한다.
`formatted_size`는 결과 크기를 구하지만 실제 출력을 함께 수행하지 않는다.
이를 먼저 호출하고 다시 출력하면 형식화 작업이 반복될 수 있다.

## 10.2 비용과 타입 소거 인터페이스

format의 성능은 구현, 할당, 숫자 변환, 로캘 사용과 출력 목적지에 달려 있다.
새 인터페이스라는 사실만으로 스트림보다 항상 빠르다고 단정하지 않는다.
로그 경로에서는 형식화 비용과 파일·콘솔 I/O 비용을 분리해서 살펴본다.

`vformat`과 `vformat_to`는 타입 소거된 인수 목록을 받아 공통 구현 경로를 만들기 좋다.
호출 경계의 템플릿 코드를 줄일 수 있지만 인수 목록이 값을 소유한다고 가정하면 안 된다.
`make_format_args`로 만든 인수 뷰를 원래 변수 수명보다 오래 저장하지 않는다.

다음은 독립 실행 예제다.

```cpp
#include <cassert>
#include <format>
#include <string>

int main() {
    std::string pattern = "name={}, count={}";
    std::string name = "queue";
    int count = 3;
    auto text = std::vformat(pattern, std::make_format_args(name, count));
    assert(text == "name=queue, count=3");
}
```

## 10.3 형식 문자열 읽기

`{}`는 다음 인수, `{0}`는 명시한 인수 번호다.
자동 번호와 수동 번호를 섞지 않는다.
중괄호 자체를 출력하려면 `{{`와 `}}`로 쓴다.
콜론 뒤에는 정렬, 부호, 폭, 정밀도, 타입 등의 형식 지정이 온다.

폭은 보통 최소 폭이며 긴 문자열을 자동으로 자르는 최대 길이가 아니다.
문자열 최대 표시 길이에는 정밀도 등 해당 타입의 규칙을 확인한다.
채움 문자와 `<`, `>`, `^`를 조합해 왼쪽·오른쪽·중앙 정렬을 표현한다.

정수의 `d`, `x`, `b`, 실수의 `f`, `e`, `g`처럼 표시 형태를 선택할 수 있다.
정수에 실수 전용 지정자를 주는 식의 불일치는 오류다.
같은 정밀도 숫자도 타입과 표시 방식에 따라 소수 자릿수 또는 유효 숫자를 뜻한다.

동적 폭이나 정밀도도 다른 인수로 제공할 수 있다.
출력 모양을 외부 입력에서 받는다면 허용 폭과 전체 결과 크기를 제한할지 검토한다.
오류 처리와 자원 사용 정책은 형식 문자열의 문법 검증과 별개다.

## 10.4 국제화

기본 형식화는 로캘 의존성을 최소화한다.
로캘 인수를 넘기고 `L` 형식 옵션을 사용하는 등 지원되는 방식으로 지역화한다.
숫자 구분자와 소수점 표시가 사용자 지역 설정에 따라 바뀔 수 있다.

번역 문장에서는 수동 인수 번호를 사용해 어순을 바꿀 수 있다.
날짜나 복수형 같은 번역 문제 전체를 `format` 하나가 해결하는 것은 아니다.
기계가 다시 읽는 저장 형식과 사용자가 읽는 지역화 출력도 분리한다.

## 10.5 오류 처리와 구현 버전

C++20 초기 설계와 컴파일 시간 형식 검사 관련 결함 수정 P2216R3를 구분한다.
수정이 반영된 구현의 `format`은 리터럴 형식 문자열 오류를 컴파일 시간에 잡는다.
실행 중 받은 패턴에는 C++20의 `vformat` 경로를 사용한다.
C++26의 `runtime_format`을 C++20 해법으로 제시하지 않는다.

실행 중 형식 오류는 `format_error`로 보고될 수 있다.
할당 실패나 사용자 formatter가 내는 다른 예외까지 모두 같은 오류는 아니다.
라이브러리의 `<format>` 지원 여부도 컴파일러 언어 모드와 별도로 확인한다.

## 10.6 사용자 정의 formatter

사용자 타입에는 허용되는 방식으로 `std::formatter<MyType, char>`를 특수화한다.
`parse`는 형식 옵션을 읽고, `format`은 컨텍스트의 출력 위치에 내용을 기록한다.
파싱 위치 반환과 출력 반복자 반환은 각각 해당 컨텍스트 규칙을 따라야 한다.

기존 정수·문자열 formatter를 재사용하면 정렬이나 폭 지원을 반복 구현하지 않아도 된다.
예를 들어 내부 식별자를 문자열로 바꾸고 문자열 formatter에 위임할 수 있다.
다만 임시 문자열의 참조를 저장하지 않고 실제 format 호출 안에서 사용한다.

옵션을 전부 무시하는 formatter는 쓰기는 쉬워도 호출자가 잘못된 형식을 넣은 사실을 숨긴다.
지원하는 문법과 거부할 문법을 구분하고 오류를 일관되게 보고한다.
처음에는 기본 형식 하나부터 구현하고 필요한 옵션을 점진적으로 추가한다.

## 10.7 복습 질문

1. `format_to_n`의 반환 길이는 기록한 길이인가 필요한 전체 길이인가?
2. 결과를 C 문자열로 쓰려면 어떤 처리가 추가로 필요한가?
3. `make_format_args`를 저장할 때 어떤 객체의 수명이 중요한가?
4. 지역화된 숫자 출력을 파일 교환 형식에 쓰면 어떤 문제가 생길 수 있는가?

[형식화 함수 명세](https://eel.is/c++draft/format.functions)와 [형식화 전체 규칙](https://eel.is/c++draft/format), [P2216R3](https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2021/p2216r3.html)를 참고했다. 링크된 작업 초안의 이후 표준 기능은 별도로 구분했다.

예제의 실행 검증 여부는 시리즈 통합 검증 기록을 따른다.
