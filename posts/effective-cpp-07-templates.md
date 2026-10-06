---
title: "Effective C++ 공부 07: 템플릿과 일반화 프로그래밍"
description: "암시적 인터페이스, 의존 이름과 typename, 템플릿 기반 클래스, 코드 팽창, 멤버 함수 템플릿, traits와 템플릿 메타프로그래밍을 현대 C++로 연결합니다."
date: "2026-10-06"
order: 7
category: "C++"
subcategory: "Effective C++"
tags: ["C++","Effective C++","Templates","Generic Programming"]
image: ""
readingTime: ""
featured: false
draft: true
aiGenerated: true
---
템플릿은 타입을 지운 런타임 다형성과 달리, 타입의 구체적인 연산을 컴파일 시간에 조합한다. 강력한 만큼 이름 탐색, 코드 생성, 오류 메시지와 빌드 비용을 이해해야 한다. 현대 C++의 concepts는 이 장의 암시적 계약을 명시적으로 표현하는 도구가 된다.

## 아이템 41: 암시적 인터페이스와 컴파일 시간 다형성을 이해하자

가상 함수 기반 인터페이스는 함수 시그니처가 명시적이다. 템플릿은 본문에서 수행하는 표현식이 요구 조건이 된다.

```cpp
template <typename T>
concept Updatable = requires(T value, float deltaTime) {
    { value.Update(deltaTime) } -> std::same_as<void>;
};

template <Updatable T>
void Tick(T& value, float deltaTime) {
    value.Update(deltaTime);
}
```

3판 당시에는 오류 메시지와 문서로만 드러나던 암시적 인터페이스를 concepts로 이름 붙일 수 있다. concepts는 구현을 생성하지 않으며, 제네릭 알고리즘이 요구하는 최소 연산을 설명한다.

## 아이템 42: 의존 타입 이름에는 `typename`이 필요하다

템플릿 안의 `T::value_type`이 타입인지 정적 값인지 파서가 미리 알 수 없는 경우 `typename`으로 타입임을 알려야 한다.

```cpp
template <typename Container>
void PrintFirst(const Container& values) {
    typename Container::const_iterator it = values.begin();
    if (it != values.end()) std::cout << *it;
}
```

별칭 템플릿과 `auto`가 문법 부담을 줄여 주지만, 의존 이름의 두 단계 이름 탐색 원리는 여전히 중요하다.

## 아이템 43: 템플릿 기반 클래스의 이름에 접근하는 방법을 알자

템플릿 기반 클래스의 멤버는 파생 템플릿을 처음 파싱할 때 존재한다고 가정되지 않는다. `this->`, `using`, 또는 기반 클래스를 명시해 의존 이름임을 표현한다.

```cpp
template <typename T>
class NetworkActor : public ActorBase<T> {
public:
    void Replicate() {
        this->SendState();
    }
};
```

이는 특수화된 기반 클래스에는 해당 멤버가 없을 수 있기 때문이다. 문법을 외우기보다 템플릿이 정의 시점과 인스턴스화 시점 두 단계에서 검사된다는 점을 이해한다.

## 아이템 44: 타입과 무관한 코드는 템플릿 밖으로 빼자

템플릿 인수만 다르고 실제 기계어가 같은 코드가 각 인스턴스마다 생성되면 바이너리와 빌드 시간이 커진다. 공통 계산은 비템플릿 기반 함수나 별도 구현으로 분리한다.

```cpp
class MatrixStorage {
protected:
    static void Invert(float* data, std::size_t size);
};

template <std::size_t N>
class Matrix : private MatrixStorage {
public:
    void Invert() { MatrixStorage::Invert(data_.data(), N); }
private:
    std::array<float, N * N> data_{};
};
```

공통화가 지나치면 타입 정보가 사라지고 최적화를 막을 수 있다. 생성되는 코드 크기와 실행 성능을 측정해 경계를 잡는다.

## 아이템 45: 호환 타입을 받는 멤버 함수 템플릿을 사용하자

`shared_ptr<Derived>`를 `shared_ptr<Base>`로 변환하듯, 템플릿 인스턴스 사이의 자연스러운 변환을 생성자 템플릿으로 표현할 수 있다.

```cpp
template <typename T>
class Handle {
public:
    template <typename U>
        requires std::convertible_to<U*, T*>
    Handle(const Handle<U>& other) : pointer_(other.get()) {}

    T* get() const noexcept { return pointer_; }

private:
    T* pointer_ = nullptr;
};
```

멤버 함수 템플릿이 일반 복사 생성자나 복사 대입 연산자의 자동 생성을 막지는 않는다. 동일 타입 복사 정책도 별도로 결정해야 한다.

## 아이템 46: 변환이 필요한 템플릿 연산은 클래스 안의 비멤버로 선언하자

클래스 템플릿의 연산자에서 양쪽 인수에 암시적 변환을 허용하려면 비멤버 함수가 필요하다. 클래스 안에 friend로 정의하면 클래스 인스턴스화 시 구체적인 비템플릿 함수가 함께 만들어져 타입 추론 문제를 피할 수 있다.

```cpp
template <typename T>
class Rational {
public:
    Rational(T numerator, T denominator = 1);

    friend Rational operator*(const Rational& left, const Rational& right) {
        return {left.numerator_ * right.numerator_,
                left.denominator_ * right.denominator_};
    }

private:
    T numerator_;
    T denominator_;
};
```

## 아이템 47: 타입 정보는 traits로 표현하자

알고리즘이 타입마다 다른 최적 경로를 선택해야 할 때 traits가 컴파일 시간 정보를 제공한다. 표준 라이브러리의 iterator traits와 type traits가 대표적이다.

```cpp
template <std::random_access_iterator Iterator>
void AdvanceFast(Iterator& it, std::iter_difference_t<Iterator> distance) {
    it += distance;
}
```

책의 태그 디스패치 기법은 여전히 유효하지만, `if constexpr`와 concepts를 사용하면 분기를 더 직접적으로 표현할 수 있다. traits는 타입 분류를 제공하고 알고리즘은 그 정보에 따라 컴파일 시간 분기를 선택한다.

## 아이템 48: 템플릿 메타프로그래밍을 이해하자

템플릿 메타프로그래밍은 컴파일 시간에 타입과 값을 계산한다. 과거에는 재귀 특수화가 중심이었지만 현대 C++에는 `constexpr`, `consteval`, type traits, concepts가 있다.

```cpp
consteval std::size_t PacketHeaderSize(std::size_t fieldCount) {
    return 8 + fieldCount * 4;
}

constexpr auto HeaderSize = PacketHeaderSize(3);
```

컴파일 시간 계산은 런타임 비용을 없애고 잘못된 구성을 빌드 단계에서 거부할 수 있다. 반면 복잡한 타입 계산은 오류 메시지와 빌드 시간을 악화시킨다. 런타임 코드로도 충분한 문제를 무리하게 메타프로그래밍으로 옮기지 않는다.

## 실전 기준

- 제네릭 알고리즘의 요구 사항을 concepts로 이름 붙인다.
- 템플릿 오류가 어렵다면 암시적 인터페이스를 더 작게 나눈다.
- 공통 구현을 분리하되 타입 정보와 최적화 기회를 잃지 않는다.
- traits, `if constexpr`, concepts 중 가장 단순한 도구를 선택한다.
- 컴파일 시간과 바이너리 크기도 성능 예산에 포함한다.
- 템플릿은 “모든 타입 지원”이 아니라 필요한 연산을 만족하는 타입 지원이다.

## 참고 자료

- [C++ Core Guidelines: Templates and generic programming](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#S-templates)
- [Effective C++ 55개 항목 요약](https://clchiou.github.io/notes-effective-c%2B%2B/)
- [Effective C++ 3판 한국어 목차](https://www.ikpil.com/521)
