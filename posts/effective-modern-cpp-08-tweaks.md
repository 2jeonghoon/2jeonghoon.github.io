---
title: "08: 세부 조정"
description: "Item 41–42. 값 전달과 emplacement를 실제 비용과 생성자 선택으로 판단합니다."
date: "2026-10-19"
order: 8
category: "C++"
subcategory: "Effective Modern C++"
tags: ["C++", "Effective Modern C++", "값 전달", "emplace"]
image: ""
readingTime: ""
featured: false
draft: true
aiGenerated: true
---

[공식 목차](https://www.oreilly.com/library/view/effective-modern-c/9781491908419/)의 마지막 장 Item 41–42를 공부한다. 공개 목차와 언어·라이브러리 참조를 바탕으로 만든 개인 노트이며 책 전체 본문의 번역이 아니다. 예제는 서로 독립적인 C++11/14 선언·함수 조각이다.

## Item 41. 항상 복사할 인수라면 값 전달 검토하기

호출자가 lvalue를 주든 rvalue를 주든 항상 멤버에 저장하는 함수라면 값 매개변수가 인터페이스를 단순하게 만들 수 있다. 매개변수로 받은 값을 함수 내부에서 소유하고 마지막 사용에서 멤버로 옮긴다.

```cpp
#include <string>
#include <utility>
class PlayerName {
    std::string value_;
public:
    explicit PlayerName(std::string value)
        : value_(std::move(value)) {}
};
```

lvalue 호출에서는 매개변수로 복사한 뒤 멤버로 이동한다. rvalue 호출에서는 이동이나 복사 생략이 가능하지만 C++11/14에서 생략 여부는 적용 조건에 따라 다르다. 이동 비용이 작고 추가 이동을 허용할 수 있다면 const&와 && 두 오버로드를 줄이는 장점이 있다.

```cpp
#include <string>
#include <utility>
void createNames() {
    std::string source = "runner";
    PlayerName first(source);               // source는 유지
    PlayerName second(std::move(source));   // source를 소비할 수 있음
    PlayerName third(std::string("guest"));
}
```

이 코드는 앞의 PlayerName 선언과 함께 사용하는 호출부다. 이동 후 source의 내용이 비었다고 가정하지 않는다. 다시 대입하거나 파괴할 수 있지만 이전 문자열 내용을 요구하면 안 된다.

### 복사 대입의 용량 재사용도 비교하기

```cpp
#include <string>
#include <utility>
class StatusText {
    std::string value_;
public:
    void setByReference(const std::string& value) { value_ = value; }
    void setByValue(std::string value) { value_ = std::move(value); }
};
```

이미 있는 멤버에 반복 대입할 때 const& 버전의 복사 대입은 기존 용량을 재사용할 수 있다. 값 버전은 매개변수 복사를 위해 새 저장 공간을 확보할 수 있어 항상 이득이라고 할 수 없다. 실제 할당 여부와 비용은 문자열 크기, 기존 용량, 구현에 따라 달라진다.

값 전달은 읽기만 하는 큰 객체에 일괄 적용하지 않는다. 가상 함수에 기반 클래스 값을 넘기면 파생 부분이 잘리는 slicing도 생길 수 있다. 복사가 필요 없는 입력이나 다형적 객체에는 참조 기반 인터페이스가 더 알맞다.

**내 판단 순서:** 항상 저장하는가, 이동 가능한가, 이동이 싼가, 추가 이동이 중요한가, 기존 버퍼 재사용 이득이 있는가를 묻는다. 문법의 간결함과 측정한 비용을 함께 비교한다.

## Item 42. 원소를 직접 만들 수 있으면 emplacement 검토하기

```cpp
#include <string>
#include <vector>
void addLabels() {
    std::vector<std::string> labels;
    labels.reserve(2);
    labels.emplace_back(6, 'a');
    labels.push_back(std::string(6, 'b'));
}
```

emplace_back은 전달한 인수로 원소를 직접 생성할 수 있다. push_back 버전은 먼저 완성한 string을 넘긴다. 다만 최적화와 이동 비용에 따라 실제 차이는 작을 수 있고, 재할당 시 기존 원소 이동 비용은 여전히 남는다.

이미 완성된 객체를 넘기는 `emplace_back(existing)`도 복사를 할 수 있다. emplace라는 이름만으로 복사·이동이 없어지지 않는다. [vector의 삽입 명세](https://eel.is/c++draft/vector.modifiers)

### 생성자 선택이 의도와 맞는지 확인하기

```cpp
#include <string>
#include <vector>
void differentMeaning() {
    std::vector<std::string> lines;
    lines.emplace_back(4, 'x'); // "xxxx"
    // lines.push_back(4);     // string으로 암시적 변환되지 않음
}
```

emplace는 명시적 생성자까지 직접 호출할 수 있어 push에서 걸러졌던 인수를 허용할 수 있다. 인수의 단위나 순서를 잘못 적으면 컴파일 성공이 올바른 의미를 보장하지 않는다. 필요한 곳에는 완성된 타입을 명시해서 검토 경계를 만든다.

스마트 포인터 원소 컨테이너에 raw new 결과를 바로 emplace하는 것도 주의한다. 컨테이너 내부 할당이 스마트 포인터 생성 전에 실패하면 소유되지 않은 포인터가 남을 수 있다. 자원은 먼저 소유자에 넣는다.

```cpp
#include <memory>
#include <vector>
void addOwner() {
    std::vector<std::unique_ptr<int>> values;
    values.push_back(std::make_unique<int>(55)); // C++14
}
```

이 경우 이미 안전한 소유자가 생겼으므로 emplace로 바꿀 실질적 이유가 크지 않다. 연관 컨테이너의 중복 키 처리와 임시 노드 생성 비용도 컨테이너별로 다르다. 모든 삽입 API를 한 규칙으로 치환하지 않는다.

## 측정할 때 기록할 것

- 입력이 lvalue인지 rvalue인지와 객체 크기를 기록한다.
- 컨테이너 용량 확보 여부와 할당 횟수를 구분한다.
- 생성자 호출 수와 최적화된 빌드 실행 시간을 별도로 본다.
- 예외 안전성과 코드 의도가 유지되는지 먼저 확인한다.

학습용 로그 생성자를 넣으면 호출 경로를 볼 수 있지만 로그 자체가 최적화와 시간 측정을 왜곡할 수 있다. 비용 모델을 확인하는 실험과 최종 성능 측정을 나눠 수행한다. 이 글의 코드는 벤치마크 결과를 주장하지 않는다.

## 시리즈를 마치며

앞 장의 타입 추론과 전달 규칙은 마지막 두 항목에서도 다시 등장한다. 값으로 받을 때 어떤 복사가 생기는지, emplace의 전달 인수가 어떤 생성자를 고르는지 읽을 수 있어야 최적화 판단이 가능하다.

[저자 소개](https://www.aristeia.com/EMC%2B%2B.html) · [Core Guidelines: 입력 매개변수](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#Rf-in). 현재 초안과 지침은 이후 표준을 포함하므로 C++17의 보장된 복사 생략을 C++11/14 예제의 필수 동작으로 가정하지 않는다.

[이전: 동시성 API](/?post=effective-modern-cpp-07-concurrency-api) · [시리즈 개요](/?post=effective-modern-cpp-overview)
