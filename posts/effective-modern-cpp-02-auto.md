---
title: "02: auto"
description: "Item 5–6. auto를 기본 선택으로 쓰되 프록시와 지연 표현식의 경계를 확인합니다."
date: "2026-10-27"
order: 2
category: "C++"
subcategory: "Effective Modern C++"
tags: ["C++","Effective Modern C++","auto","프록시"]
image: ""
readingTime: ""
featured: false
draft: false
aiGenerated: false
---
[공식 목차](https://www.oreilly.com/library/view/effective-modern-c/9781491908419/)의 2장, Item 5–6을 순서대로 정리한다. 공개 자료와 언어 참조를 바탕으로 직접 작성한 학습 노트이며 책 본문을 완역한 글이 아니다. 예제의 기준은 C++11/14다.

## Item 5. 명시적인 타입보다 auto를 먼저 검토하기

auto는 타입 정보를 없애기보다 초기화 식에 연결한다. 선언 시 초기값이 필요하므로 초기화하지 않은 지역 변수를 줄이는 데도 도움이 된다. 컨테이너가 반환하는 정확한 타입을 그대로 받는다는 장점도 있다.

```cpp
#include <string>
#include <unordered_map>

void inspect() {
    std::unordered_map<std::string, int> counts{{"apple", 3}};
    for (const auto& entry : counts) {
        const auto amount = entry.second;
        (void)amount;
    }
}
```

unordered_map의 원소는 pair<const Key, Value>다. 반복 변수를 `const std::pair<std::string, int>&`로 잘못 적으면 실제 원소와 타입이 달라 변환용 임시 객체가 생길 수 있다. auto&는 이 중복 선언을 피한다.

그러나 auto만 적으면 값 복사가 일어난다. 반복문에서 원소를 읽기만 한다면 const auto&가 더 적절할 수 있다. 값이 작고 복사본이 필요하면 auto를 선택한다.

### 람다의 실제 타입을 유지하기

```cpp
#include <algorithm>
#include <vector>

void order() {
    std::vector<int> values{8, 1, 5};
    auto descending = [](int left, int right) { return left > right; };
    std::sort(values.begin(), values.end(), descending);
}
```

각 람다는 고유한 클로저 타입을 가진다. auto로 받으면 이 타입을 유지한다. std::function은 호출 가능한 객체를 공통 타입으로 저장해야 할 때 유용하지만 타입 소거와 복사 가능성 등의 계약이 추가된다. 지역 알고리즘에 전달할 람다마다 std::function을 강제할 이유는 없다.

**주의:** auto가 언제나 더 짧거나 읽기 쉬운 것은 아니다. 단위, 정밀도, 외부 인터페이스를 강조하려는 위치에서는 명시적 타입이 유용하다. 특히 정수 나눗셈의 결과는 auto를 쓰더라도 정수다.

```cpp
auto ratio = 3 / 2;         // int, 값은 1
double accurate = 3.0 / 2; // 1.5
```

타입 이름을 생략해도 초기화 식의 의미를 검토할 책임은 남는다. [auto의 타입 결정](https://eel.is/c++draft/dcl.spec.auto)

## Item 6. 원하지 않은 타입이면 명시적인 변환으로 경계를 만들기

auto는 내가 원한 타입이 아니라 식이 반환한 타입을 받는다. 대표적으로 vector<bool>은 비트 저장을 위해 참조처럼 행동하는 프록시를 사용할 수 있다.

```cpp
#include <vector>

void flags() {
    std::vector<bool> bits{true, false};
    auto proxy = bits[0];              // bool 값이 아닐 수 있다
    auto snapshot = static_cast<bool>(bits[0]);
    bits[0] = false;
    bool current = proxy;              // 원본의 현재 상태를 읽음
    (void)snapshot;                    // 처음 읽은 true를 보관
    (void)current;
}
```

[vector<bool> 참조 프록시 명세](https://eel.is/c++draft/vector.bool.pspc)에서 값과 참조 객체의 차이를 확인할 수 있다. snapshot은 독립적인 bool이다. proxy는 원본 저장소와 관계를 유지하므로 원본 변경을 관찰할 수 있다. vector가 파괴되거나 저장소가 재할당된 뒤 프록시를 사용하면 수명 문제가 생긴다.

```cpp
#include <vector>

std::vector<bool> makeFlags() { return {true, false}; }
bool firstFlag() {
    auto value = static_cast<bool>(makeFlags()[0]);
    return value;
}
```

임시 벡터가 문장 끝에서 사라지기 전에 bool을 얻는다. 같은 위치에서 `auto value = makeFlags()[0];`를 쓰면 임시의 저장소를 가리키는 프록시만 남을 수 있다.

표현식 템플릿 라이브러리에서도 유사한 문제가 나타난다. `auto sum = left + right;`가 계산 완료된 행렬이 아니라 나중에 계산할 식 객체일 수 있다. 입력의 변경과 파괴가 결과에 영향을 주는지 해당 라이브러리 계약을 읽어야 한다.

**판단 기준:** 값 스냅샷을 원하는 경계에서 실제 값 타입으로 변환한다. 모든 auto를 없애기보다 프록시가 외부로 빠져나가는 지점을 분명히 한다.

## 두 항목을 함께 적용하는 순서

1. 초기화 식이 어떤 API를 호출하는지 확인한다.
2. API 반환형이 값, 참조, 프록시 중 무엇인지 확인한다.
3. 지역 변수가 원본을 따라가야 하는지, 독립적인 값을 가져야 하는지 정한다.
4. 그 의도를 auto&, const auto&, 값 변환 중 하나로 표현한다.

이 순서는 타입 이름 길이보다 의미를 우선한다. 자동 추론은 반복적인 타입 표기를 줄이는 수단이고 소유권이나 평가 시점을 대신 결정하지 않는다.

## 복습 질문

- map의 key가 const라는 사실을 수동 pair 선언에 반영했는가?
- 범위 for에서 auto를 auto&로 바꾸면 어떤 복사가 사라지는가?
- 현재 코드에서 bool 프록시와 bool 값의 관찰 결과가 달라지는가?
- 반환값이 지연 계산이라면 입력은 언제까지 살아 있어야 하는가?

## 참고와 이어 읽기

- [저자: 책의 대상과 범위](https://www.aristeia.com/EMC%2B%2B.html)
- [C++ 작업 초안: 람다 클로저 타입](https://eel.is/c++draft/expr.prim.lambda.closure)
- [C++ Core Guidelines: ES.11 auto 활용](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#Res-auto)

현재 초안과 지침은 C++11/14 이후 내용도 포함한다. 이 글은 이후의 구조적 바인딩이나 ranges를 전제로 하지 않는다. 코드 블록은 별개 예제이며 성능 비교 결과를 의미하지 않는다.

[이전: 타입 추론](/?post=effective-modern-cpp-01-deducing-types) · [개요](/?post=effective-modern-cpp-overview) · [다음: 현대 C++로 옮겨가기](/?post=effective-modern-cpp-03-moving-to-modern-cpp)
