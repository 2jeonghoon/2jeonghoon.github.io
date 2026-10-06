---
title: "Effective C++ 공부 05: 구현을 단단하게 만들기"
description: "변수 정의 시점, 캐스팅 최소화, 내부 핸들 노출 방지, 예외 안전성, 인라인과 컴파일 의존성을 통해 구현의 안정성과 빌드 비용을 관리합니다."
date: "2026-10-06"
order: 5
category: "C++"
subcategory: "Effective C++"
tags: ["C++", "Effective C++", "Exception Safety", "PImpl"]
image: ""
readingTime: ""
featured: false
draft: false
aiGenerated: true
---

인터페이스가 사용법을 결정한다면 구현은 실패했을 때의 상태와 변경 비용을 결정한다. 이 장은 객체 수명을 짧게 유지하고, 타입 시스템을 우회하지 않으며, 예외가 발생해도 불변식을 보존하고, 헤더 의존성을 통제하는 방법을 다룬다.

## 아이템 26: 변수 정의는 가능한 한 늦추자

객체를 너무 일찍 만들면 사용하지 않는 경로에서도 생성과 소멸 비용을 낸다. 기본 생성 후 대입하기보다 실제 값으로 곧바로 초기화한다.

```cpp
if (!player.IsConnected()) return;

const std::string message = BuildWelcomeMessage(player);
Send(message);
```

루프에서는 매 반복마다 생성할지, 루프 밖에서 재사용할지 비용을 비교해야 한다. 수명을 짧게 하면 상태가 다음 반복으로 새는 위험이 줄고, 재사용하면 할당을 줄일 수 있다. 측정과 가독성을 함께 본다.

## 아이템 27: 캐스팅을 최소화하자

C++ 캐스트는 의도를 구분한다.

- `static_cast`: 컴파일 시간에 정의된 변환
- `dynamic_cast`: 다형적 계층의 런타임 검사
- `const_cast`: const 속성 변경
- `reinterpret_cast`: 비트 표현 수준의 저수준 해석

```cpp
if (auto* boss = dynamic_cast<Boss*>(&enemy)) {
    boss->StartPhaseTwo();
}
```

캐스트가 반복된다면 타입 계층이나 인터페이스가 필요한 동작을 표현하지 못한다는 신호일 수 있다. 특히 C 스타일 캐스트는 여러 변환 중 무엇이 일어났는지 감추므로 피한다. 정수와 포인터를 서로 바꾸는 reinterpret cast는 플랫폼과 ABI 경계 같은 제한된 영역에 격리한다.

## 아이템 28: 객체 내부를 가리키는 핸들을 반환하지 말자

private 멤버의 포인터, 참조, 반복자를 외부에 돌려주면 호출자가 객체 불변식을 우회하거나 객체보다 오래 보관할 수 있다.

```cpp
class World {
public:
    std::span<const Entity> Entities() const noexcept { return entities_; }

private:
    std::vector<Entity> entities_;
};
```

읽기 전용 view도 소유 객체의 수명과 재할당에 종속된다. API 문서에서 유효 기간을 명확히 하고, 오래 보관해야 한다면 값 복사나 안정적인 ID를 반환한다. const 멤버 함수가 변경 가능한 포인터를 반환하면 논리적 const도 무너진다.

## 아이템 29: 예외 안전한 코드를 만들자

예외 안전성은 보통 세 수준으로 설명한다.

- 기본 보장: 자원 누수 없이 객체는 유효하지만 값은 바뀔 수 있다.
- 강한 보장: 실패하면 호출 전 상태가 유지된다.
- 비실패 보장: 연산이 예외를 던지지 않는다.

강한 보장은 새 상태를 임시 객체에 완성한 뒤 한 번에 교체하는 방식으로 만들기 쉽다.

```cpp
void Settings::Reload(const Path& path) {
    Settings next = ParseSettings(path); // 실패해도 현재 객체는 그대로
    swap(next);                          // noexcept 교환
}
```

모든 함수에 강한 보장이 필요한 것은 아니다. 네트워크 송신이나 외부 시스템 변경처럼 되돌릴 수 없는 효과가 있다면 부분 성공 정책을 명시하고 재시도·보상 동작을 설계해야 한다.

## 아이템 30: 인라인의 장단점을 이해하자

`inline`은 단순히 “함수 호출을 없애라”는 명령이 아니다. 컴파일러는 비용 모델에 따라 실제 인라이닝을 결정하며, 현대 C++에서 키워드의 중요한 역할은 여러 번역 단위에 동일한 정의를 허용하는 것이다.

헤더에 큰 함수를 넣으면 빌드 시간과 바이너리 크기가 늘고 구현 변경 때 많은 파일이 다시 컴파일된다. 작고 안정적이며 자주 호출되는 함수는 인라이닝 후보가 되지만, 최적화 여부는 프로파일러와 생성 코드를 보고 판단한다. 가상 함수도 실제 타입을 컴파일러가 알면 devirtualization 후 인라인될 수 있다.

## 아이템 31: 파일 사이의 컴파일 의존성을 줄이자

헤더에서 필요하지 않은 정의까지 include하면 작은 변경이 전체 재빌드로 번진다. 포인터나 참조만 필요한 타입은 전방 선언을 사용하고, 구현 세부를 PImpl로 숨길 수 있다.

```cpp
// GameSession.h
class GameSession {
public:
    GameSession();
    ~GameSession();

private:
    class Impl;
    std::unique_ptr<Impl> impl_;
};
```

PImpl은 ABI 안정성과 빌드 격리에 도움이 되지만 간접 접근과 동적 할당 비용을 추가한다. 모든 클래스에 적용하기보다 변경이 잦은 구현, 큰 외부 헤더, 공개 라이브러리 경계에 선택적으로 사용한다. C++20 모듈도 의존성 모델을 개선하지만 인터페이스 설계의 책임까지 없애지는 않는다.

## 게임 프로젝트에서의 적용

- 프레임 루프의 임시 객체는 필요한 분기 안에서 직접 초기화한다.
- 다운캐스트가 반복되면 컴포넌트 질의 또는 가상 인터페이스를 재검토한다.
- 엔티티 주소보다 안정적인 ID와 세대 번호를 외부에 전달한다.
- 로딩은 임시 상태에 완성한 뒤 활성 상태와 교체한다.
- 엔진 헤더를 공개 헤더에 퍼뜨리지 않고 어댑터나 PImpl 경계에 둔다.
- 인라인 최적화는 프로파일 결과가 있는 핫 패스에서만 판단한다.

## 참고 자료

- [Effective C++ 학습 노트와 코드 예제](https://www.kuniga.me/blog/2023/02/15/review-effective-cpp.html)
- [C++ Core Guidelines: Error handling](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#S-errors)
- [Effective C++ 55개 항목 요약](https://clchiou.github.io/notes-effective-c%2B%2B/)
