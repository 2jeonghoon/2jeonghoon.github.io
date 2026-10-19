---
title: "05: Rvalue 참조, 이동 의미론과 완벽 전달"
description: "Item 23–30. move와 forward, 전달 참조와 참조 축약의 조건을 정리합니다."
date: "2026-10-19"
order: 5
category: "C++"
subcategory: "Effective Modern C++"
tags: ["C++", "Effective Modern C++", "Move Semantics", "Perfect Forwarding"]
image: ""
readingTime: ""
featured: false
draft: true
aiGenerated: true
---

[공식 목차](https://www.oreilly.com/library/view/effective-modern-c/9781491908419/)의 5장 Item 23–30 순서다. 공개 목차와 언어 참조를 연결한 독자적인 공부 노트이며 책 본문 전체를 번역한 글이 아니다. 예제는 독립적인 선언·함수 조각이고 C++11/14를 기준으로 한다.

## Item 23. std::move는 변환, std::forward는 조건부 전달

```cpp
#include <string>
#include <utility>
void consume(const std::string&) {}
void consume(std::string&&) {}

template<class T> void relay(T&& value) {
    consume(std::forward<T>(value));
}
void take(std::string&& value) {
    consume(std::move(value));
}
```

이름 있는 value 표현식은 두 함수 안에서 모두 lvalue다. move는 이를 이동 후보인 xvalue로 바꾼다. forward는 추론된 T에 따라 호출자가 준 lvalue 성격을 보존할 수 있다. 둘 다 그 자체로 자원을 옮기거나 생성자를 호출하는 연산은 아니다.

const 객체에 move를 붙여도 const가 제거되지 않는다. 보통 T&&를 받는 이동 생성자는 const T&&를 받을 수 없어 복사가 선택될 수 있다. 이동 가능하다는 추측보다 실제 선택되는 오버로드를 확인한다. [move와 forward 명세](https://eel.is/c++draft/forward)

## Item 24. T&&가 전달 참조인지 문맥 확인하기

```cpp
#include <vector>
template<class T> void accept(T&&);       // 전달 참조
template<class T> void inspect(const T&&);// 전달 참조 아님
template<class T> void vectors(std::vector<T>&&); // 전달 참조 아님
```

함수 템플릿 호출에서 추론되는 cv 비한정 타입 매개변수의 T&&가 핵심 형태다. 책의 universal reference는 이런 사용을 설명하는 용어다. 클래스 템플릿에서 이미 결정된 T의 T&&를 모두 같은 것으로 취급하면 안 된다.

auto&& 지역 변수도 초기화 식에 따라 참조가 결정되어 범용 코드에서 유용하다. 하지만 초기화 목록에서 추론하는 auto&&에는 특별 규칙이 있어 단순 전달 참조 설명을 일괄 적용하지 않는다.

## Item 25. 소비에는 move, 전달에는 forward를 마지막 사용에서 적용하기

```cpp
#include <string>
#include <utility>
class Label {
    std::string text_;
public:
    explicit Label(std::string text) : text_(std::move(text)) {}
    template<class T> void set(T&& text) {
        text_ = std::forward<T>(text);
    }
};
```

값으로 받은 text는 이 함수가 소유한 값이므로 멤버에 넘기는 마지막 위치에서 소비할 수 있다. set의 text는 호출자 lvalue일 수 있어 무조건 move하면 안 된다. move 또는 forward 후에도 다시 읽는 코드가 있다면 이동 후 상태를 고려해야 한다.

지역 값을 반환할 때는 보통 `return result;`를 사용한다. `return std::move(result);`는 이름 있는 반환값 최적화 기회를 막을 수 있다. C++17의 prvalue 복사 생략 보장은 이후 변화이며 C++11/14의 모든 반환에 소급해 설명하지 않는다.

## Item 26. 전달 참조 오버로드의 과도한 흡수 경계하기

```cpp
#include <string>
#include <utility>
void logName(int) {}
template<class T> void logName(T&& value) {
    std::string name(std::forward<T>(value));
    (void)name;
}
// short id = 2; logName(id); // 템플릿이 더 잘 맞고 본문에서 실패 가능
```

short lvalue는 int로 변환하는 일반 함수보다 정확히 맞는 템플릿을 선택할 수 있다. 전달 참조 생성자는 비const 객체를 받는 경우 복사 생성자보다 더 좋은 후보가 될 수도 있다. 후보 선택 이후 본문에서 에러가 나도 자동으로 다른 오버로드로 돌아가지 않는다.

**주의:** 템플릿의 유연함이 인터페이스의 넓이를 뜻한다. 받아들일 타입을 정하지 않으면 원래 의도한 일반 오버로드를 가릴 수 있다.

## Item 27. 전달 참조 오버로드를 피하거나 제약하기

대안은 이름 분리, const& 또는 값 전달, 태그 디스패치, enable_if 제약이다. 호출 규약이 단순하다면 이름 분리가 이해하기 쉽다. 저장할 문자열은 값으로 받고 이동하는 방법도 먼저 검토한다.

```cpp
#include <string>
#include <type_traits>
#include <utility>

template<class T,
    typename std::enable_if<
        std::is_constructible<std::string, T&&>::value, int>::type = 0>
void storeText(T&& value) {
    std::string saved(std::forward<T>(value));
    (void)saved;
}
```

이 예제는 string을 만들 수 없는 인수를 후보에서 제외한다. 실제 전달 생성자라면 자기 타입과 파생 타입을 제외하는 조건도 필요할 수 있다. 제약은 구현 오류를 숨기는 장치가 아니라 API의 입력 계약이다. C++20 concepts는 이후 대안이며 이 예제의 전제가 아니다.

## Item 28. 참조 축약은 & 하나만 있어도 lvalue 참조

```cpp
#include <type_traits>
using L = int&;
using R = int&&;
static_assert(std::is_same<L&&, int&>::value, "&와 &&");
static_assert(std::is_same<R&, int&>::value, "&&와 &");
static_assert(std::is_same<R&&, int&&>::value, "&&와 &&");
```

소스에 `int& &`를 직접 쓸 수 있다는 뜻은 아니다. 타입 별칭이나 템플릿 치환으로 참조가 합쳐질 때 적용되는 규칙이다. 전달 참조에 lvalue를 넘기면 T가 참조 타입으로 추론되므로 이 축약을 거쳐 lvalue 참조 매개변수가 된다. [참조 선언과 축약](https://eel.is/c++draft/dcl.ref)

## Item 29. 이동이 존재하고 싸고 실제 선택된다고 가정하지 않기

고정 크기 배열은 원소마다 이동하므로 원소 수에 비례할 수 있다. 짧은 문자열의 내부 저장 방식도 상수 시간 포인터 교환만으로 설명할 수 없다. 이동 연산이 없는 타입에 rvalue를 넘기면 복사가 가능할 수 있다.

컨테이너가 강한 예외 보장을 지키려면 예외 가능 이동 대신 복사를 선택할 수 있다. 사용자 타입이 move 생성자를 제공한다는 사실만으로 재배치 때 그 함수가 쓰인다고 단정하지 않는다.

이동 후 표준 라이브러리 객체는 별도 명세가 없으면 유효하지만 값이 명시되지 않은 상태로 본다. unique_ptr의 빈 상태 보장처럼 더 강한 개별 계약은 따로 확인한다. 임의의 사용자 타입까지 같은 계약이 자동 적용되지는 않는다.

## Item 30. 완벽 전달이 막히는 표현식을 알아두기

```cpp
#include <initializer_list>
#include <utility>
void useList(std::initializer_list<int>) {}
template<class T> void relayList(T&& list) {
    useList(std::forward<T>(list));
}
void call() {
    auto values = {3, 6};
    relayList(values);
    // relayList({3, 6}); // T를 추론할 수 없음
}
```

중괄호 목록 자체에는 일반적인 추론 대상 타입이 없다. 오버로드된 함수 이름도 선택할 함수 타입을 정하지 못하면 전달할 수 없다. 비트 필드는 일반적인 참조를 묶을 수 없어 값 복사 경계를 만들어야 한다.

C++11/14에서는 정적 const 정수 멤버를 참조로 전달하면서 ODR 사용이 발생해 클래스 밖 정의가 필요할 수도 있다. 직접 값으로 사용하던 식을 전달 함수로 감쌌을 때 링크 오류가 생기는 이유다. 이후 inline 변수와 혼동하지 않는다. [함수 호출 추론의 예외](https://eel.is/c++draft/temp.deduct.call)

## 복습과 참고

- 선언된 참조 타입과 표현식의 값 범주를 구분한다.
- 전달 템플릿의 허용 타입을 먼저 적는다.
- move를 붙이기 전 마지막 사용인지 확인한다.
- 반환 최적화, 이동 호출 횟수, 실제 실행 비용을 구분한다.

[저자의 책 안내](https://www.aristeia.com/EMC%2B%2B.html). 현재 작업 초안은 계속 갱신되므로 이후 기능을 포함한다. 이 글의 코드 조각은 각각 별도로 사용한다.

[이전: 스마트 포인터](/?post=effective-modern-cpp-04-smart-pointers) · [개요](/?post=effective-modern-cpp-overview) · [다음: 람다 표현식](/?post=effective-modern-cpp-06-lambda-expressions)
