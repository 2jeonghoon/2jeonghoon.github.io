---
title: "21: 핵심 언어의 작은 개선"
description: "범위 for 초기화, 열거자 using, char8_t, aggregate와 새 속성을 공부합니다."
date: "2026-10-19"
order: 21
category: "C++"
subcategory: "C++20 — The Complete Guide"
tags: ["C++", "C++20", "Core Language", "Initialization", "Attributes"]
image: ""
readingTime: ""
featured: false
draft: true
aiGenerated: true
---

[전체 학습 지도](/?post=cpp20-complete-guide-overview)

이 글은 『C++20 — The Complete Guide』의 [공개 공식 목차](https://leanpub.com/cpp20)와 [저자 예제 목록](https://www.cppstd20.com/code/toc.html)을 학습 순서의 기준으로 삼은 개인 공부 초안이다. 접근하지 못한 책 전체 본문을 읽고 요약했다는 뜻은 아니다. 언어와 라이브러리 규칙을 1차 자료로 확인하고, 설명과 예제는 독립적으로 재구성했다. 각 코드 블록은 서로 별개이며, 일부 코드 조각은 문맥을 함께 표시한다.

## 21.1 초기화 구문이 있는 범위 for

범위 for 앞부분에서 순회에 필요한 객체를 만들면 사용 범위를 반복문 안으로 좁힐 수 있다.
임시 객체의 하위 범위를 참조하는 경우에도 소유 객체를 이름으로 붙잡는 데 유용하다.
C++20에서 모든 임시 하위 객체의 수명이 자동으로 연장된다고 가정하지 않는다.

```cpp
#include <vector>
#include <cassert>

int main() {
    int sum = 0;
    for (auto values = std::vector{2, 3, 5}; int value : values) {
        sum += value;
    }
    assert(sum == 10);
}
```

초기화 문장은 한 번 실행되고 그 지역 객체는 반복문이 끝날 때 파괴된다.
소유하는 컨테이너와 이를 빌리는 view의 수명 관계를 같은 범위에서 확인하면 읽기 쉽다.
중간 표현식에서 이미 사라진 임시 객체를 나중에 붙잡을 수는 없다.

## 21.2 열거자를 using으로 가져오기

스코프 있는 enum의 열거자 하나를 `using`으로 가져올 수 있다.
`using enum`은 해당 열거자들을 한 번에 현재 범위로 가져오는 문법이다.
명시적 enum 타입의 강점과 짧은 분기 코드를 상황에 맞게 조합한다.

```cpp
#include <string_view>
#include <cassert>

enum class State { waiting, running, stopped };

std::string_view label(State state) {
    using enum State;
    switch (state) {
    case waiting: return "waiting";
    case running: return "running";
    case stopped: return "stopped";
    }
    return "unknown";
}
int main() { assert(label(State::running) == "running"); }
```

넓은 헤더 범위에서 이름을 전부 가져오면 짧고 흔한 열거자 이름이 충돌할 수 있다.
지역 함수나 작은 switch 범위에서 쓰는 편이 영향을 확인하기 쉽다.
모든 정수 비트 패턴이 유효한 열거 상태라고 가정하지 않아 기본 반환 경로도 남겼다.

## 21.3 다른 범위로 열거 타입을 전달하기

타입 별칭으로 enum 타입에 새로운 이름을 주거나 using 선언으로 열거자를 노출할 수 있다.
이 과정이 별개의 새로운 enum 타입을 생성하는 것은 아니다.
기존 API를 감싼 클래스에서 어떤 이름을 공개할지 정하는 용도로 생각한다.

열거자의 소속 타입과 이름이 보이는 범위를 구분하면 오버로드 오류를 읽기 쉽다.
노출 범위를 바꾸어도 기반 타입, 허용 변환, 비교 규칙은 원래 enum을 따른다.

## 21.4 char8_t와 UTF-8 문자열

C++20의 `u8"..."` 리터럴은 `char8_t` 요소를 사용한다.
따라서 이를 `const char*`에 바로 대입하던 코드는 호환성 문제가 생길 수 있다.
`std::u8string`과 `std::u8string_view`는 이 구분을 타입으로 드러낸다.

```cpp
#include <string_view>
#include <type_traits>

constexpr std::u8string_view text = u8"Seoul";
static_assert(text.size() == 5);
static_assert(!std::is_same_v<char, char8_t>);
int main() {}
```

UTF-8의 코드 유닛 개수와 사람이 보는 문자 개수는 다르다.
`char8_t`가 생겼다고 Unicode 정규화나 자소 분할까지 해결된 것은 아니다.
기존 char API 경계에서는 인코딩 계약과 필요한 변환을 명시한다.

## 21.5 aggregate 초기화

지정 초기화는 필드 이름을 적어 의미를 드러내지만 C의 모든 지정 초기화 문법을 허용하지는 않는다.
C++20에서는 직접 데이터 멤버를 선언 순서대로 지정해야 한다.
배열 인덱스 지정이나 자유로운 중첩 지정을 그대로 가져오지 않는다.

```cpp
#include <cassert>

struct Window { int width; int height; bool visible = true; };
int main() {
    Window wide{.width = 1200, .height = 800};
    Window compact(640, 480, false);
    assert(wide.visible && compact.width == 640);
}
```

괄호 aggregate 초기화는 일반 생성자 호출처럼 보여도 aggregate 규칙을 따른다.
중괄호와 축소 변환 검사, 참조 멤버에 바인딩된 임시 수명 등이 같다고 단정하지 않는다.
사용자 선언 생성자가 있으면 aggregate 여부가 달라질 수 있어 초기화 가능성을 다시 확인한다.

## 21.6 속성과 21.7 기능 검사 매크로

`[[likely]]`, `[[unlikely]]`는 가능성 힌트다. 프로그램 논리나 측정 결과를 대체하지 않는다.
`[[no_unique_address]]`는 비정적 멤버가 공간을 공유할 수 있게 하지만 반드시 크기가 줄어든다고 보장하지 않는다.
주소의 유일성에 의존한 로직이나 ABI를 설계할 때 특히 주의한다.

`[[nodiscard("reason")]]`은 결과를 버렸을 때 진단할 이유를 설명할 수 있다.
속성은 경고의 품질을 높이는 도구이므로, 오류 처리 정책을 실제 타입과 호출 흐름에서도 드러낸다.
기능 검사 매크로는 지원 수준을 조건부 컴파일에 반영할 수 있게 한다.

C++20 모드를 켰다는 사실만으로 모든 라이브러리 기능이 구현되었다고 판단하지 않는다.
언어용 `__cpp_...`와 라이브러리용 `__cpp_lib_...`, 속성용 `__has_cpp_attribute`를 역할별로 확인한다.
검사에 필요한 표준 헤더나 `<version>`도 포함한다.

## 21.8 복습 질문

- 범위 for에서 순회 대상의 소유 객체는 언제 파괴되는가?
- using enum의 이름 충돌 범위를 얼마나 좁힐 수 있는가?
- UTF-8 코드 유닛 수와 사용자 관점 문자 수를 구분하는가?
- aggregate의 괄호와 중괄호 초기화가 같은 조건을 검사하는가?

## 복습에 사용한 1차 자료

- [C++20 초안 N4861: 범위 for](https://timsong-cpp.github.io/cppwp/n4861/stmt.ranged)
- [C++20 초안 N4861: using enum](https://timsong-cpp.github.io/cppwp/n4861/enum.udecl)
- [C++20 초안 N4861: aggregate 초기화](https://timsong-cpp.github.io/cppwp/n4861/dcl.init.aggr)
- [C++20 초안 N4861: 속성](https://timsong-cpp.github.io/cppwp/n4861/dcl.attr)
