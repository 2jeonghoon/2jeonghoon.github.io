---
title: "01: C++에 익숙해지기"
description: "C++를 여러 하위 언어의 연합체로 바라보고, 전처리기보다 언어 기능을 선택하며, const와 초기화를 통해 오류를 컴파일 단계로 옮기는 방법을 정리합니다."
date: "2026-10-06"
order: 1
category: "C++"
subcategory: "Effective C++"
tags: ["C++","Effective C++","const","Initialization"]
image: ""
readingTime: ""
featured: false
draft: false
aiGenerated: false
---
『Effective C++ 3판』의 첫 장은 개별 문법보다 C++를 바라보는 기준을 세운다. C++는 C의 절차적 기능, 객체지향, 템플릿, STL이 한 언어 안에 공존한다. 어느 영역을 사용하느냐에 따라 좋은 설계와 비용 모델이 달라진다는 점을 먼저 받아들여야 한다.

## 아이템 1: C++를 언어들의 연합체로 바라보자

C++의 규칙을 하나의 단순한 모델로 설명하기는 어렵다. C 스타일 영역에서는 값과 포인터, 배열이 중심이고 객체지향 영역에서는 캡슐화와 가상 함수가 중요하다. 템플릿은 컴파일 시간 다형성과 코드 생성 규칙을 따르며 STL은 반복자와 함수 객체를 이용한 값 중심 설계를 선호한다.

```cpp
void ApplyDamage(Character& target, int amount);       // 객체지향 인터페이스

template <typename Range, typename Predicate>
auto FindTarget(Range&& range, Predicate predicate);   // 템플릿과 STL 스타일
```

어느 스타일이 항상 우월한 것은 아니다. 게임 루프의 연속 메모리 데이터에는 값과 알고리즘이 잘 맞고, 교체 가능한 게임 규칙에는 런타임 다형성이 자연스러울 수 있다. 먼저 현재 코드가 어느 하위 언어의 규칙을 따르는지 파악해야 불필요한 가상 호출이나 템플릿 팽창 같은 비용도 판단할 수 있다.

## 아이템 2: `#define`보다 `const`, `enum`, `inline`을 사용하자

전처리기는 컴파일러가 타입을 검사하기 전에 단순 치환된다. 이름이 심볼 테이블에 남지 않을 수 있고, 괄호 하나가 빠진 매크로 함수는 예상과 다른 식을 만든다.

```cpp
#define MAX_PLAYERS 100
#define SQUARE(x) ((x) * (x))

inline constexpr std::size_t MaxPlayers = 100;

template <typename T>
constexpr T Square(const T& value) {
    return value * value;
}
```

현대 C++에서는 네임스페이스 범위의 `inline constexpr` 변수를 헤더에 안전하게 둘 수 있다. 함수 템플릿은 타입 검사와 인수 평가 규칙을 그대로 유지한다. 조건부 컴파일처럼 전처리기만 할 수 있는 일은 남지만, 타입과 값의 표현은 가능한 한 언어 안으로 가져오는 편이 안전하다.

## 아이템 3: 가능한 한 `const`를 사용하자

`const`는 문서가 아니라 컴파일러가 검사하는 계약이다. 읽기 전용 매개변수, 상태를 바꾸지 않는 멤버 함수, 변경하면 안 되는 포인터 관계를 구분해 코드의 의도를 좁힌다.

```cpp
class Inventory {
public:
    const Item* Find(ItemId id) const;
    Item* Find(ItemId id);

    std::size_t Size() const noexcept { return items_.size(); }

private:
    std::vector<Item> items_;
};
```

논리적 const와 물리적 const도 구분해야 한다. 외부에서 관찰되는 상태는 같지만 캐시를 갱신해야 한다면 제한적으로 `mutable`을 사용할 수 있다. 단, `mutable`을 일반 상태 변경을 숨기는 도구로 쓰면 const 계약이 무너진다. 멀티스레드 코드에서 const는 자동으로 스레드 안전을 의미하지도 않는다.

## 아이템 4: 객체는 사용하기 전에 초기화하자

기본 제공 타입의 초기화 여부는 문맥에 따라 달라질 수 있으므로 선언과 동시에 값을 부여하는 습관이 중요하다. 클래스 멤버는 생성자 본문이 시작되기 전에 초기화되므로 대입보다 멤버 초기화 목록을 사용한다.

```cpp
class PlayerSession {
public:
    PlayerSession(PlayerId id, Socket socket)
        : id_(id), socket_(std::move(socket)), connected_(true) {}

private:
    PlayerId id_;
    Socket socket_;
    bool connected_ = false;
};
```

멤버는 초기화 목록에 적은 순서가 아니라 클래스에 선언된 순서대로 초기화된다. 의존하는 멤버가 있다면 선언 순서도 그 의존성을 따라야 한다. 서로 다른 번역 단위의 전역 객체 초기화 순서는 보장하기 어려우므로, 필요할 때 함수 지역 정적 객체를 생성하는 방식도 유용하다.

```cpp
Registry& GlobalRegistry() {
    static Registry instance;
    return instance;
}
```

C++11부터 함수 지역 정적 객체의 초기화는 스레드 안전하게 수행된다. 그래도 전역 상태 자체가 만드는 결합도는 별개의 문제이므로 수명과 소유권을 분명히 해야 한다.

## 게임 코드에 적용할 체크리스트

- 값과 알고리즘, 런타임 다형성, 템플릿 중 현재 문제에 맞는 모델을 고른다.
- 상수와 작은 함수는 매크로보다 `constexpr`와 `inline`으로 표현한다.
- 읽기 전용 계약을 매개변수와 멤버 함수에 드러낸다.
- 모든 멤버에 안전한 기본값을 주고 생성자 초기화 목록을 사용한다.
- 전역 객체 사이의 초기화 순서에 의존하지 않는다.

## 참고 자료

- [Effective C++ 3판 공식 목차](https://www.oreilly.com/library/view/effective-c-third/0321334876/)
- [Effective C++ 3판 한국어 항목 목록](https://www.ikpil.com/521)
- [C++ Core Guidelines](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines)
