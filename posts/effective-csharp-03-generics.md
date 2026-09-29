---
title: "Effective C# 공부 03: 제네릭 API를 유연하게 설계하기"
description: "제네릭 제약 조건과 런타임 최적화, 비교 계약, IDisposable, 공변성·반공변성, 제네릭 메서드와 확장 메서드까지 아이템 18~28을 상세히 정리한 학습 노트입니다."
date: "2026-09-28"
category: "C#"
subcategory: "Effective C#"
tags: ["C#", ".NET", "Effective C#", "Generics"]
featured: false
draft: true
aiGenerated: true
---

제네릭은 형변환과 중복 구현을 줄이는 기능을 넘어, 타입에 대한 요구 사항을 컴파일러가 검사하게 만드는 API 설계 도구다. 그러나 제약을 지나치게 강하게 걸거나 런타임 타입에 따른 동작을 숨기면 재사용성과 예측 가능성이 떨어진다. 이 단원은 열린 제네릭 설계와 구체 타입의 기능 확장 사이에서 균형을 잡는 방법을 다룬다.

## [제네릭 개요: 열린 타입과 닫힌 타입](https://blog.uniony.me/effective-cs-chapter3/)

`List<T>`처럼 타입 인수를 아직 정하지 않은 선언은 열린 제네릭 타입이고, `List<int>`처럼 실제 인수가 정해진 타입은 닫힌 제네릭 타입이다. 닫힌 타입만 인스턴스화할 수 있다. 런타임은 참조 타입을 인수로 사용한 여러 닫힌 타입에서 기계어 코드를 공유할 수 있지만, 값 타입은 크기와 표현이 달라 별도 코드가 생성될 수 있다.

제네릭은 `object` 기반 컨테이너보다 타입 안전하며 값 타입의 박싱을 피한다. 동시에 `T`에 대해 허용된 연산은 제약 조건이나 제네릭 계약으로 확인 가능한 범위에 한정된다. “어떤 타입도 받을 수 있다”와 “아무 연산이나 할 수 있다”는 같은 뜻이 아니다.

## [아이템 18: 반드시 필요한 제약 조건만 설정하라](https://blog.uniony.me/effective-cs-item18/)

`where T : ...` 제약은 구현에 필요한 능력을 컴파일러에 알려주고 호출자에게 계약을 설명한다. 하지만 편의를 위해 구체 베이스 클래스나 여러 인터페이스를 요구하면 실제로 사용할 수 있는 타입을 불필요하게 줄인다. 구현에서 호출하지 않는 멤버를 위해 제약을 추가해서는 안 된다.

```csharp
public static T Max<T>(T left, T right) where T : IComparable<T> =>
    left.CompareTo(right) >= 0 ? left : right;
```

제약으로 표현할 수 없는 동작은 델리게이트로 받을 수 있다. 예를 들어 객체 생성 규칙이 단순한 `new()`보다 복잡하다면 팩터리 함수를 받는 편이 유연하다. 제약은 오류를 일찍 발견하게 하지만 공개 API의 호환성과 재사용 범위를 결정하므로 최소 계약만 남긴다.

## [아이템 19: 런타임 타입을 확인해 최적 알고리즘을 사용하라](https://blog.uniony.me/effective-cs-item19/)

제네릭 구현은 컴파일 시점 계약을 기준으로 작성되지만, 실제 런타임 객체가 더 효율적인 인터페이스를 제공할 수 있다. 예를 들어 `IEnumerable<T>`의 개수를 구할 때 실제 객체가 `ICollection<T>`라면 순회하지 않고 `Count`를 읽을 수 있다.

```csharp
public static int CountFast<T>(IEnumerable<T> source) => source switch
{
    ICollection<T> generic => generic.Count,
    System.Collections.ICollection legacy => legacy.Count,
    _ => source.Count()
};
```

이 기법은 의미가 같은 여러 알고리즘 중 더 빠른 경로를 선택할 때만 써야 한다. 타입별 결과가 달라지거나 임의의 구체 타입 목록이 늘어나면 유지보수가 어렵다. 표준 인터페이스를 먼저 검사하고, 실제 프로파일에서 가치가 있는 경로만 특화한다.

## [아이템 20: `IComparable<T>`와 `IComparer<T>`로 순서를 정의하라](https://blog.uniony.me/effective-cs-item20/)

`IComparable<T>`는 타입 자체의 자연스러운 기본 순서를 정의한다. 반면 `IComparer<T>`는 이름순, 점수순, 최신순처럼 외부에서 여러 정렬 규칙을 제공한다. 기본 순서가 하나로 명확하지 않다면 타입에 억지로 `IComparable<T>`를 넣지 않고 비교자를 요구하는 편이 낫다.

비교는 음수, 0, 양수의 의미를 일관되게 지켜야 하며 반사성, 반대칭성, 추이성을 만족해야 정렬 알고리즘이 올바르게 동작한다. `Equals`가 같다고 판단한 두 값은 기본 비교에서도 0이 되도록 맞추는 것이 일반적이다.

제네릭이 아닌 `IComparable`은 오래된 API 호환에 필요할 수 있지만 잘못된 타입과의 비교를 런타임에 처리해야 하고 박싱이 생길 수 있다. 새 코드에서는 제네릭 계약을 우선한다. 관계 연산자를 제공한다면 `CompareTo`, `Equals`, 연산자 사이의 의미가 서로 모순되지 않게 구현한다.

## [아이템 21: `T`가 `IDisposable`일 가능성에 대비하라](https://blog.uniony.me/effective-cs-item21/)

제네릭 컨테이너나 알고리즘이 `T` 인스턴스를 만들거나 소유하면 실제 타입이 `IDisposable`일 수 있다. 소유한 객체를 정리하지 않으면 리소스가 누수된다. 반대로 호출자가 넘긴 객체까지 임의로 정리하면 소유권 계약을 깨뜨린다.

해결 방식은 수명 책임에 따라 달라진다. 메서드 안에서 만들고 사용하는 객체는 `using`으로 즉시 정리한다. 컨테이너가 장기간 소유한다면 컨테이너도 `IDisposable`을 구현해 내부 항목 중 정리 가능한 객체를 종료한다. 소유하지 않는다면 문서와 타입 설계로 호출자 책임임을 분명히 한다.

```csharp
public TResult Use<T, TResult>(Func<T> factory, Func<T, TResult> action)
{
    T value = factory();
    try { return action(value); }
    finally { (value as IDisposable)?.Dispose(); }
}
```

무조건 `where T : IDisposable`을 추가하면 정리가 필요 없는 타입을 배제한다. 구현에 Dispose 호출이 본질적인 계약일 때만 제약을 사용한다.

## [아이템 22: 공변성과 반공변성을 지원하라](https://blog.uniony.me/effective-cs-item22/)

공변성은 더 구체적인 출력 타입을 더 일반적인 출력 타입으로 사용할 수 있게 한다. `IEnumerable<Dog>`를 `IEnumerable<Animal>`로 볼 수 있는 이유는 시퀀스가 `T`를 밖으로 내보내기만 하기 때문이다. 인터페이스와 델리게이트의 타입 매개변수에 `out`으로 표현한다.

반공변성은 더 일반적인 입력 소비자를 더 구체적인 입력 위치에 사용할 수 있게 한다. 모든 `Animal`을 비교할 수 있는 `IComparer<Animal>`은 `Dog` 비교에도 사용할 수 있으며 `in`으로 표현한다.

```csharp
public interface IProducer<out T> { T Create(); }
public interface IConsumer<in T> { void Accept(T value); }
```

`T`를 입력과 출력에 모두 사용하는 `IList<T>` 같은 인터페이스는 불변이어야 한다. 그렇지 않으면 `IList<Dog>`를 `IList<Animal>`로 바꾼 뒤 고양이를 넣는 타입 안전성 문제가 생긴다. 변성은 참조 타입 변환에 적용되며 API의 데이터 흐름을 정확히 반영해야 한다.

## [아이템 23: 메서드 수준 제약은 델리게이트로 표현하라](https://blog.uniony.me/effective-cs-item23/)

타입 전체에는 아무 제약이 필요 없지만 특정 메서드만 `T`에 대한 연산을 요구할 수 있다. C# 제약 조건으로 연산자나 임의의 정적 메서드 요구를 모두 표현하기 어려운 경우, 필요한 동작을 델리게이트 매개변수로 받으면 된다.

```csharp
public static T Fold<T>(IEnumerable<T> source,
                        T seed,
                        Func<T, T, T> combine)
{
    T result = seed;
    foreach (T item in source)
        result = combine(result, item);
    return result;
}
```

이 방식은 제네릭 타입을 특정 인터페이스에 묶지 않고 호출자가 알고리즘의 한 부분을 주입하게 한다. 비교, 변환, 생성, 누적처럼 작은 동작에 적합하다. 같은 델리게이트를 매 호출마다 반복 작성해 의미가 흐려진다면 이름 있는 비교자나 전략 객체로 승격하는 것을 고려한다.

## [아이템 24: 베이스 클래스나 인터페이스에 대해 제네릭을 특화하지 말라](https://blog.uniony.me/effective-cs-item24/)

제네릭 메서드와 특정 베이스 타입용 오버로드를 함께 제공하면 호출 시점의 정적 타입 때문에 예상과 다른 오버로드가 선택될 수 있다. 런타임 객체가 파생 타입이어도 컴파일러는 변수에 선언된 타입을 기준으로 오버로드를 결정한다.

```csharp
void Process<T>(T value) { }
void Process(Base value) { }

Base a = new Derived(); // Base 오버로드
Derived b = new();      // 제네릭 또는 더 구체적인 후보 선택 가능
```

이런 특화는 명시적 형변환 여부에 따라 동작과 성능이 달라져 API를 예측하기 어렵게 만든다. 공통 계약은 제네릭 구현 하나로 유지하고, 런타임 최적화가 정말 필요하면 메서드 내부에서 표준 인터페이스를 검사한다. 의미가 다른 작업이라면 오버로드 대신 다른 이름으로 구분한다.

## [아이템 25: 인스턴스 필드가 필요 없다면 제네릭 메서드를 정의하라](https://blog.uniony.me/effective-cs-item25/)

제네릭 타입은 객체의 상태 자체가 `T`에 의존할 때 적합하다. 단지 메서드 하나가 다양한 타입을 처리하기 위해 `T`가 필요하다면 비제네릭 타입 안의 제네릭 메서드가 더 작고 유연한 계약이다.

제네릭 메서드는 메서드마다 서로 다른 제약을 가질 수 있고, 대부분 인수에서 타입을 추론하므로 호출자가 타입 매개변수를 명시할 필요가 없다. 특정 타입용 비제네릭 오버로드도 자연스럽게 추가할 수 있다.

```csharp
public static class Serialization
{
    public static byte[] Encode<T>(T value, IEncoder<T> encoder) =>
        encoder.Encode(value);
}
```

반대로 컬렉션, 캐시, 파서처럼 인스턴스의 필드와 수명 전체가 같은 `T`를 중심으로 구성되면 제네릭 클래스가 맞다.

## [아이템 26: 제네릭과 비제네릭 인터페이스를 함께 구현하라](https://blog.uniony.me/effective-cs-item26/)

.NET 생태계에는 `IComparable<T>`와 `IComparable`, `IEnumerable<T>`와 `IEnumerable`처럼 새 제네릭 API와 기존 비제네릭 API가 함께 존재한다. 라이브러리 타입이 넓은 호환성을 목표로 한다면 둘을 일관되게 구현할 필요가 있다.

타입 안전한 실제 로직은 제네릭 구현에 두고 비제네릭 멤버는 타입 검사 후 그 구현으로 전달한다. 잘못된 타입에는 명확한 예외를 발생시킨다. `Equals(object)`도 가능하면 `IEquatable<T>.Equals(T)`로 위임해 의미가 갈라지지 않게 한다.

```csharp
public int CompareTo(Player? other) { /* 실제 비교 */ }

int IComparable.CompareTo(object? obj) => obj switch
{
    Player other => CompareTo(other),
    null => 1,
    _ => throw new ArgumentException("Expected Player", nameof(obj))
};
```

필요하지 않은 레거시 인터페이스까지 무조건 구현할 이유는 없다. 실제 소비 API가 요구하는 호환 범위를 기준으로 선택한다.

## [아이템 27: 인터페이스는 작게, 기능 확장은 확장 메서드로 하라](https://blog.uniony.me/effective-cs-item27/)

인터페이스에 멤버를 추가하면 모든 구현체가 영향을 받는다. 구현체가 많거나 외부 사용자가 구현할 수 있는 공개 인터페이스일수록 변경 비용이 크다. 필수 계약만 인터페이스에 남기고, 기존 멤버만으로 표현 가능한 편의 기능은 확장 메서드로 제공하면 구현 부담 없이 API를 발전시킬 수 있다.

```csharp
public interface ICustomerStore
{
    Customer? Find(int id);
}

public static class CustomerStoreExtensions
{
    public static Customer GetRequired(this ICustomerStore store, int id) =>
        store.Find(id) ?? throw new KeyNotFoundException();
}
```

확장 메서드는 실제 인스턴스 멤버가 아니며 다형적으로 오버라이드할 수 없다. 저장소 내부 상태 접근이나 구현별 최적화가 반드시 필요한 기능은 인터페이스 계약에 포함하는 편이 낫다. 최근 C#의 기본 인터페이스 구현도 선택지지만 버전 호환성과 의미를 신중히 검토한다.

## [아이템 28: 확장 메서드로 구체화된 제네릭 타입을 개선하라](https://blog.uniony.me/effective-cs-item28/)

`IEnumerable<T>` 전체가 아니라 `IEnumerable<Employee>`나 `Dictionary<EmployeeId, Employee>`처럼 특정 타입 인수가 들어간 형태에만 의미 있는 기능을 확장 메서드로 제공할 수 있다. 원본 타입을 상속하거나 감싸지 않고도 도메인 언어를 추가한다.

```csharp
public static IEnumerable<Employee> ActiveOnly(
    this IEnumerable<Employee> employees) =>
    employees.Where(e => e.IsActive);
```

이 방식은 도메인 로직을 호출 위치마다 반복하는 일을 줄이고, 기존 타입과 함께 자연스럽게 발견된다. 그러나 범용 네임스페이스에 너무 많은 확장을 넣으면 자동 완성 목록과 이름 충돌이 커진다. 응집된 네임스페이스에 두고, 상태를 가져야 하거나 불변식을 강제해야 하는 기능은 전용 타입으로 모델링한다.

## 복습할 내용

- 열린 제네릭과 닫힌 제네릭, 참조 타입과 값 타입의 코드 생성 차이를 설명한다.
- 제약 조건, 델리게이트 주입, 런타임 인터페이스 검사 중 적합한 방식을 사례별로 고른다.
- 생산자와 소비자 인터페이스를 직접 만들고 `out`과 `in`이 허용하는 변환을 확인한다.
- 인터페이스 핵심 멤버와 확장 메서드로 둘 기능을 구분하는 기준을 작성한다.
