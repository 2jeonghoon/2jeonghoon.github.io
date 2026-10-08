---
title: "06: 상속과 객체지향 설계"
description: "public·private 상속의 의미, 이름 숨김, 인터페이스와 구현 상속, 가상 함수 대안, 합성, 다중 상속을 설계 관점에서 정리합니다."
date: "2026-10-08"
order: 6
category: "C++"
subcategory: "Effective C++"
tags: ["C++","Effective C++","Inheritance","Object-Oriented Design"]
image: ""
readingTime: ""
featured: false
draft: false
aiGenerated: false
---
상속은 코드를 재사용하는 문법이기 전에 타입 사이의 관계를 선언하는 도구다. public 상속은 대체 가능성을 약속하고, 합성과 private 상속은 구현 관계를 표현한다. 관계의 의미를 먼저 정하지 않으면 작은 재사용을 위해 강한 결합을 만들게 된다.

## 아이템 32: public 상속은 `is-a` 관계다

`Derived`가 `Base`를 public 상속하면 Base가 필요한 모든 위치에서 Derived를 사용할 수 있어야 한다. 단순히 공통 필드가 있다는 이유만으로 상속하면 이 계약을 지키기 어렵다.

```cpp
class Damageable {
public:
    virtual ~Damageable() = default;
    virtual void ApplyDamage(int amount) = 0;
};
```

정사각형과 직사각형처럼 현실 세계의 분류가 코드의 변경 가능성 계약과 맞지 않을 수도 있다. public 상속은 문장으로 “파생 타입은 기반 타입이다”라고 읽었을 때뿐 아니라 모든 기반 연산의 사전·사후 조건을 지킬 때 사용한다.

## 아이템 33: 상속된 이름을 숨기지 말자

파생 클래스에 같은 이름의 함수 하나를 선언하면 기반 클래스의 다른 오버로드까지 이름 탐색에서 가려질 수 있다.

```cpp
class Enemy : public Actor {
public:
    using Actor::Move;
    void Move(const Path& path);
};
```

`using` 선언으로 기반 오버로드를 다시 노출할 수 있다. 인터페이스 일부만 물려받고 싶다는 요구가 반복되면 public 상속 자체가 맞는지 검토한다.

## 아이템 34: 인터페이스 상속과 구현 상속을 구분하자

순수 가상 함수는 파생 클래스가 반드시 제공해야 할 인터페이스를 표현한다. 일반 가상 함수는 인터페이스와 기본 구현을 함께 제공한다. 비가상 함수는 모든 파생 클래스가 그대로 따라야 할 불변 동작을 뜻한다.

기본 구현을 가상 함수에 바로 넣으면 파생 클래스가 실수로 재정의하지 않아도 조용히 기본 동작을 사용한다. 반드시 의식적으로 선택하게 하려면 순수 가상 인터페이스와 별도의 protected 기본 구현 함수를 나눌 수 있다.

## 아이템 35: 가상 함수 대신 사용할 방법도 고려하자

런타임 다형성은 유용하지만 유일한 확장 방식은 아니다.

- Template Method: 비가상 공개 함수가 호출 순서와 불변식을 지키고 일부 단계만 가상으로 둔다.
- Strategy: 함수 객체나 `std::function`을 주입한다.
- 정적 다형성: 템플릿과 concepts로 컴파일 시간에 동작을 선택한다.
- 데이터 중심 분기: 종류와 데이터를 테이블로 표현한다.

```cpp
class Character {
public:
    int CalculateDamage() const {
        return std::max(0, DoCalculateDamage());
    }

private:
    virtual int DoCalculateDamage() const = 0;
};
```

공개 비가상 함수가 공통 사후 조건을 보장하고 파생 타입은 변화 지점만 구현한다.

## 아이템 36: 상속받은 비가상 함수를 재정의하지 말자

비가상 함수를 같은 이름으로 다시 선언하면 호출 결과가 객체의 실제 타입이 아니라 포인터나 참조의 정적 타입에 따라 달라진다. 이는 public 상속의 대체 가능성을 깨뜨린다. 다른 동작이 필요하다면 기반 함수가 가상이어야 하는지, 파생 타입이 정말 같은 종류인지 다시 설계한다.

## 아이템 37: 상속된 기본 인수 값을 재정의하지 말자

가상 함수 호출은 동적으로 결정되지만 기본 인수는 호출 지점의 정적 타입을 기준으로 컴파일된다. 파생 타입이 다른 기본값을 선언하면 함수 본문과 기본값이 서로 다른 타입에서 선택되는 혼란이 생긴다.

기본 인수는 비가상 공개 함수 한 곳에 두고, 그 함수가 인수를 명시해 private 가상 함수로 전달하는 NVI 패턴을 사용할 수 있다.

## 아이템 38: 합성은 `has-a` 또는 `implemented-in-terms-of`다

캐릭터가 인벤토리를 “가지고” 있거나, 큐를 deque를 이용해 “구현”하는 관계는 상속보다 멤버 합성이 자연스럽다.

```cpp
class Character {
private:
    Inventory inventory_;
    MovementController movement_;
};
```

합성은 내부 구현 타입을 교체하기 쉽고 외부에 불필요한 기반 인터페이스를 노출하지 않는다. 코드 재사용만 필요하다면 우선 합성을 검토한다.

## 아이템 39: private 상속은 `implemented-in-terms-of`다

private 상속에서는 파생 객체가 기반 타입으로 대체되지 않는다. 기반 구현을 이용하면서 protected 멤버 접근이나 가상 함수 재정의가 꼭 필요할 때 사용할 수 있다. 그렇지 않다면 합성이 관계를 더 명확히 표현한다.

빈 기반 클래스 최적화처럼 객체 크기 때문에 private 상속이 쓰이기도 했지만, 현대 C++20의 `[[no_unique_address]]`가 더 직접적인 대안이 될 수 있다.

## 아이템 40: 다중 상속은 신중하게 사용하자

다중 상속은 이름 모호성, 다이아몬드 구조, 가상 기반 클래스 초기화와 객체 배치를 복잡하게 한다. 반면 상태 없는 여러 인터페이스를 구현하는 용도는 비교적 명확하다.

```cpp
class Serializable {
public:
    virtual ~Serializable() = default;
    virtual void Serialize(Writer&) const = 0;
};

class ReplicatedActor : public Actor, public Serializable {
    // 두 역할의 계약을 구현
};
```

상태를 가진 여러 구현 클래스를 동시에 상속하기보다 인터페이스 다중 상속과 멤버 합성을 조합하는 편이 대개 단순하다.

## 설계 점검표

- public 상속은 대체 가능성을 보장할 때만 사용한다.
- 코드 재사용이 목적이면 합성을 먼저 검토한다.
- 기반 오버로드 숨김과 기본 인수의 정적 바인딩을 주의한다.
- 공개 비가상 함수로 불변식을 지키고 가상 함수는 변화 지점으로 제한한다.
- 다중 상속은 작은 인터페이스 조합에 우선 사용한다.
- 다운캐스트가 늘어날수록 계층의 책임과 확장 지점을 다시 본다.

## 참고 자료

- [C++ Core Guidelines: Class hierarchies](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#S-hier)
- [Effective C++ 3판 공식 목차](https://www.oreilly.com/library/view/effective-c-third/0321334876/)
- [Effective C++ 한국어 학습 글](https://hubring.tistory.com/69)
