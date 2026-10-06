---
title: "Effective C++ 공부 02: 생성자, 소멸자와 대입 연산자"
description: "컴파일러가 생성하는 특수 멤버 함수, 다형적 기반 클래스의 소멸자, 생성·소멸 중 가상 호출, 자기 대입과 완전한 복사를 현대 C++ 관점에서 정리합니다."
date: "2026-10-06"
order: 2
category: "C++"
subcategory: "Effective C++"
tags: ["C++","Effective C++","Constructor","Rule of Zero"]
image: ""
readingTime: ""
featured: false
draft: true
aiGenerated: false
---
클래스가 자원을 직접 관리하기 시작하면 생성, 복사, 이동, 대입, 소멸이 하나의 수명 계약으로 묶인다. 이 장의 핵심은 컴파일러가 만들어 주는 동작을 막연히 믿지 말고, 타입이 어떤 복사와 삭제를 허용하는지 명시하는 것이다.

## 아이템 5: 컴파일러가 만드는 함수를 이해하자

조건이 맞으면 컴파일러는 기본 생성자, 소멸자, 복사 생성자와 복사 대입 연산자를 만든다. 현대 C++에는 이동 생성자와 이동 대입 연산자도 포함되지만, 사용자가 다른 특수 멤버를 선언하면 자동 생성 조건이 달라진다.

가장 좋은 출발점은 자원을 표준 타입에 맡겨 특수 멤버를 직접 작성하지 않는 Rule of Zero다.

```cpp
class PlayerProfile {
public:
    std::string name;
    std::vector<Achievement> achievements;
};
```

`std::string`과 `std::vector`가 자신의 수명을 관리하므로 위 타입은 컴파일러가 생성한 복사와 이동 동작으로 충분하다.

## 아이템 6: 원하지 않는 자동 생성 함수는 금지하자

3판에서는 복사 생성자와 대입 연산자를 private으로 선언하는 기법을 설명하지만, 현대 C++에서는 `= delete`가 의도를 더 정확히 드러낸다.

```cpp
class Socket {
public:
    Socket(const Socket&) = delete;
    Socket& operator=(const Socket&) = delete;

    Socket(Socket&&) noexcept = default;
    Socket& operator=(Socket&&) noexcept = default;
};
```

복사할 수 없는 자원도 소유권 이전은 허용할 수 있다. 삭제된 함수는 public에 두어 잘못된 사용이 접근 제어 오류가 아니라 명확한 삭제 함수 오류로 보고되게 하는 편이 읽기 쉽다.

## 아이템 7: 다형적 기반 클래스에는 가상 소멸자를 두자

기반 클래스 포인터로 파생 객체를 삭제할 수 있다면 기반 소멸자는 virtual이어야 한다. 그렇지 않으면 파생 부분이 올바르게 파괴되지 않아 정의되지 않은 동작이 발생한다.

```cpp
class Component {
public:
    virtual ~Component() = default;
    virtual void Update(float deltaTime) = 0;
};
```

반대로 다형적으로 사용할 의도가 없는 값 타입까지 무조건 가상 소멸자로 만들 필요는 없다. 가상 함수 테이블과 타입 설계의 의미가 달라지기 때문이다. 삭제를 허용하지 않는 기반 인터페이스라면 소멸자를 protected 비가상으로 두는 설계도 가능하다.

## 아이템 8: 소멸자 밖으로 예외가 나가지 않게 하자

스택 되감기 중 다른 예외가 이미 처리되고 있는데 소멸자에서 또 예외가 나오면 프로그램은 종료될 수 있다. 소멸자는 실패 가능 작업을 시작하는 장소가 아니라 이미 가진 자원을 확실히 정리하는 장소여야 한다.

```cpp
class Transaction {
public:
    ~Transaction() noexcept {
        if (!committed_) RollbackWithoutThrow();
    }

    void Commit(); // 실패를 호출자가 처리할 수 있는 명시적 연산

private:
    void RollbackWithoutThrow() noexcept;
    bool committed_ = false;
};
```

정리 실패를 완전히 무시하라는 뜻은 아니다. 로그를 남기거나 상태를 수집하되, 호출자가 대응해야 하는 작업은 별도 함수로 분리한다.

## 아이템 9: 생성·소멸 중 가상 함수를 호출하지 말자

기반 생성자가 실행되는 동안 파생 부분은 아직 만들어지지 않았다. 따라서 가상 함수를 호출해도 파생 클래스 오버라이드로 디스패치되지 않는다. 소멸 중에는 반대로 파생 부분이 이미 사라진다.

공통 초기화가 파생 정보에 의존한다면 생성 후 명시적인 초기화 단계를 두거나, 생성자 인수로 필요한 값을 전달하거나, 팩토리가 완성된 객체를 조립하게 한다. 두 단계 초기화는 미완성 객체가 노출될 위험이 있으므로 팩토리가 성공한 객체만 반환하는 방식이 더 안전하다.

## 아이템 10: 대입 연산자는 `*this`의 참조를 반환하자

내장 타입처럼 연쇄 대입을 지원하려면 대입 연산자가 현재 객체의 참조를 반환해야 한다.

```cpp
Inventory& Inventory::operator=(const Inventory& other) {
    items_ = other.items_;
    return *this;
}
```

사용자 정의 복합 대입 연산자도 같은 관례를 따르면 호출자가 일관된 방식으로 사용할 수 있다.

## 아이템 11: 자기 대입을 안전하게 처리하자

`object = object`는 별칭 때문에 간접적으로도 발생할 수 있다. 기존 자원을 먼저 지운 뒤 원본을 읽으면 자기 대입에서 데이터가 사라진다. 표준 멤버를 사용한 Rule of Zero가 가장 단순한 해결책이며, 직접 자원을 다룬다면 먼저 새 상태를 준비한 뒤 교체한다.

```cpp
Buffer& Buffer::operator=(Buffer other) {
    swap(other);
    return *this;
}
```

값으로 받은 복사본과 교체하는 copy-and-swap은 자기 대입과 예외 안전성을 함께 다루기 쉽다. 다만 항상 가장 효율적인 것은 아니므로 실제 타입의 비용을 측정해야 한다.

## 아이템 12: 객체의 모든 부분을 복사하자

새 멤버를 추가했는데 사용자 정의 복사 함수에서 빼먹으면 객체 불변식이 깨진다. 상속 계층에서는 기반 클래스 부분도 명시적으로 복사해야 한다.

```cpp
Derived& Derived::operator=(const Derived& other) {
    Base::operator=(other);
    score_ = other.score_;
    return *this;
}
```

복사 생성자에서 대입 연산자를 호출하거나 그 반대로 재사용하면 이미 초기화된 객체와 아직 초기화되지 않은 객체의 차이를 흐릴 수 있다. 공통 동작이 필요하면 두 함수가 호출하는 작은 private 도우미로 분리하거나, 다시 Rule of Zero가 가능한 멤버 구성으로 바꾼다.

## 현대 C++에서 기억할 것

- 자원 소유권을 표준 컨테이너와 스마트 포인터에 맡겨 Rule of Zero를 우선한다.
- 복사 금지는 `= delete`, 이동 허용은 명시적인 move 연산으로 표현한다.
- 다형적 삭제가 가능한 기반 클래스에만 가상 소멸자가 필요하다.
- 소멸자는 `noexcept` 계약을 지키고 실패 가능한 작업을 별도 API로 분리한다.
- 직접 특수 멤버를 작성한다면 복사·이동·소멸 전체의 일관성을 함께 검토한다.

## 참고 자료

- [Effective C++ 55개 항목 정리](https://clchiou.github.io/notes-effective-c%2B%2B/)
- [C++ Core Guidelines: 클래스와 클래스 계층](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#S-class)
- [clang-tidy special member functions 검사](https://clang.llvm.org/extra/clang-tidy/checks/cppcoreguidelines/special-member-functions.html)
