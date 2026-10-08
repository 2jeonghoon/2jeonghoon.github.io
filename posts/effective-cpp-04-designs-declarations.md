---
title: "04: 설계와 선언"
description: "올바르게 사용하기 쉬운 인터페이스, 타입 설계, const 참조 전달, 캡슐화, 비멤버 함수, 암시적 변환과 예외 없는 swap을 정리합니다."
date: "2026-10-07"
order: 4
category: "C++"
subcategory: "Effective C++"
tags: ["C++","Effective C++","API Design","Interface"]
image: ""
readingTime: ""
featured: false
draft: false
aiGenerated: true
---
좋은 인터페이스는 사용자가 구현을 몰라도 올바른 코드를 작성하게 돕는다. 타입 시스템으로 단위와 소유권을 표현하고, 잘못된 상태를 만들기 어렵게 하며, 구현 세부가 외부 계약으로 새지 않게 하는 것이 이 장의 중심이다.

## 아이템 18: 올바르게 쓰기 쉽고 잘못 쓰기 어렵게 만들자

매개변수가 모두 `int`라면 순서를 바꿔도 컴파일된다. 의미가 다른 값에는 서로 다른 타입을 부여한다.

```cpp
struct PlayerId { std::uint64_t value; };
struct TeamId { std::uint32_t value; };

void JoinTeam(PlayerId player, TeamId team);
```

팩토리와 생성자는 유효한 상태만 만들고, 소유권은 스마트 포인터와 값 타입으로 드러낸다. 호출자가 반드시 기억해야 하는 정리 함수나 호출 순서가 많다면 인터페이스가 책임을 떠넘기고 있다는 신호다.

## 아이템 19: 클래스 설계는 타입 설계다

새 클래스는 값 생성, 복사, 이동, 비교, 변환, 수명, 동시 접근 규칙을 가진 새 타입을 만드는 일이다. 구현 전에 다음을 결정한다.

- 어떤 값이 유효한가?
- 기본 생성 상태가 의미 있는가?
- 값처럼 복사되는가, 고유 자원을 소유하는가?
- 암시적 변환을 허용할 것인가?
- 어떤 연산이 예외를 던지는가?
- 멀티스레드에서 공유할 수 있는가?

하나라도 답하기 어렵다면 데이터와 책임이 제대로 묶였는지 다시 살펴본다.

## 아이템 20: 값 전달보다 `const` 참조를 우선 검토하자

큰 객체를 값으로 받으면 복사가 일어나고, 기반 타입으로 받으면 파생 부분이 잘리는 slicing이 생길 수 있다.

```cpp
void Render(const Mesh& mesh);
```

그러나 모든 타입에 const 참조가 정답은 아니다. `int`, 포인터, 작은 반복자처럼 복사가 싼 타입은 값 전달이 단순하다. 함수가 인수의 복사본을 소유해야 한다면 값으로 받아 이동하는 방식도 좋다.

```cpp
void SetName(std::string name) {
    name_ = std::move(name);
}
```

기준은 “참조가 빠르다”가 아니라 크기, 복사 비용, 수명, 별칭, 함수의 소유 의도다.

## 아이템 21: 객체를 반환해야 할 때 참조를 반환하지 말자

지역 변수의 참조를 반환하면 함수 종료와 함께 수명이 끝난다. 힙에 만든 객체의 참조를 반환하면 누가 삭제할지 알기 어렵다. 새로운 결과를 만드는 연산은 값으로 반환한다.

```cpp
Vector3 operator+(const Vector3& left, const Vector3& right) {
    return {left.x + right.x, left.y + right.y, left.z + right.z};
}
```

현대 C++의 반환값 최적화와 이동 의미론 덕분에 값 반환은 대부분 자연스럽고 효율적이다. 참조 반환은 컨테이너 원소처럼 이미 존재하고 수명이 명확한 객체에 대한 접근에만 사용한다.

## 아이템 22: 데이터 멤버는 private으로 두자

private 데이터는 표현을 바꿀 자유를 준다. getter와 setter를 무조건 만들라는 뜻은 아니다. 도메인 연산을 제공해 불변식을 타입 내부에서 지킨다.

```cpp
class Health {
public:
    void ApplyDamage(int amount) {
        current_ = std::max(0, current_ - std::max(0, amount));
    }

    int Current() const noexcept { return current_; }

private:
    int current_ = 100;
};
```

protected 데이터도 파생 클래스 전체에 표현을 노출하므로 변경 비용이 크다. 파생 타입에는 필요한 연산을 protected 함수로 제공하는 편이 낫다.

## 아이템 23: 멤버보다 비멤버 비프렌드 함수를 선호하자

객체의 private 상태가 필요 없는 연산을 멤버로 넣으면 클래스 인터페이스가 커지고 결합도가 높아진다. 공개 연산을 조합하는 자유 함수는 같은 네임스페이스에 둘 수 있다.

```cpp
namespace inventory {
int CountConsumables(const Inventory& value) {
    return std::ranges::count_if(value.Items(), IsConsumable);
}
}
```

이 함수는 캡슐화를 깨지 않으며 필요하면 별도 헤더로 분리할 수 있다. 객체의 핵심 불변식을 직접 다루는 연산은 멤버, 공개 인터페이스만으로 구현되는 편의 기능은 비멤버라는 기준이 유용하다.

## 아이템 24: 모든 인수에 변환이 필요하면 비멤버 함수를 고려하자

멤버 함수의 호출 대상인 `*this`에는 일반 인수와 같은 암시적 변환이 적용되지 않는다. 대칭 연산에서 양쪽 피연산자 모두 같은 변환을 허용하려면 비멤버가 자연스럽다.

```cpp
class Rational {
public:
    Rational(int numerator, int denominator = 1);
};

Rational operator*(const Rational& left, const Rational& right);
```

이제 `Rational * int`와 `int * Rational`이 같은 규칙을 따른다. 다만 예상치 못한 변환이 위험하다면 단일 인수 생성자를 `explicit`으로 만들고 호출자가 변환을 명시하게 한다.

## 아이템 25: 예외를 던지지 않는 `swap`을 지원하자

빠르고 예외 없는 교환은 대입, 정렬, 컨테이너 재배치에 유용하다. 멤버 `swap`에 실제 구현을 두고 같은 네임스페이스의 비멤버가 이를 호출하게 한다.

```cpp
class Texture {
public:
    void swap(Texture& other) noexcept {
        using std::swap;
        swap(handle_, other.handle_);
        swap(width_, other.width_);
        swap(height_, other.height_);
    }
};

void swap(Texture& left, Texture& right) noexcept {
    left.swap(right);
}
```

제네릭 코드에서는 `using std::swap; swap(a, b);` 패턴을 사용해 표준 구현과 사용자 타입의 ADL 기반 오버로드를 함께 찾게 한다.

## 설계 점검표

- 의미가 다른 값은 강한 타입으로 구분한다.
- 생성 직후부터 유효한 객체만 만들 수 있게 한다.
- 값·const 참조·소유권 이전 중 함수 의도에 맞는 전달 방식을 택한다.
- 새 결과는 값으로 반환하고 참조 반환의 수명을 문서화한다.
- 데이터 표현은 private으로 숨기고 도메인 연산으로 불변식을 지킨다.
- private 접근이 필요 없는 기능은 자유 함수로 분리한다.

## 참고 자료

- [Effective C++ 3판 공식 소개](https://www.pearson.com/en-gb/subject-catalog/p/effective-c-55-specific-ways-to-improve-your-programs-and-designs/P200000000473)
- [C++ Core Guidelines: Interfaces](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#S-interfaces)
- [Effective C++ 3판 한국어 목차](https://www.ikpil.com/521)
