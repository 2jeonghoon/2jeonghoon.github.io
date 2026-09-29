---
title: "Effective C# 공부 01: 언어 기능을 의도에 맞게 사용하기"
description: "var, readonly, 타입 검사, 문자열 보간, 델리게이트, 이벤트, 박싱과 멤버 숨김까지 Effective C# 아이템 1~10을 상세히 정리한 학습 노트입니다."
date: "2026-09-28"
category: "C#"
subcategory: "Effective C#"
tags: ["C#", ".NET", "Effective C#", "Language Idioms"]
featured: false
draft: true
aiGenerated: true
---

첫 단원은 C# 문법을 단순히 사용할 줄 아는 수준에서 벗어나, 코드가 의도를 정확히 드러내고 변경에도 안전하도록 사용하는 방법을 다룬다. 각 권장 사항은 절대 규칙이라기보다 컴파일러와 런타임의 동작을 활용해 중복과 모호함을 줄이는 기본 선택지로 이해하는 편이 좋다.

## [아이템 1: 지역변수를 선언할 때는 `var`를 사용하는 것이 낫다](https://blog.uniony.me/effective-cs-item1/)

`var`는 동적 타입이 아니다. 컴파일러가 우변의 정적 타입을 추론하며, 이후에는 명시적으로 타입을 적은 변수와 똑같이 검사된다. 긴 제네릭 타입을 반복하지 않아도 되고, 생성 코드와 선언 타입이 달라지는 실수를 피할 수 있다는 것이 핵심 장점이다. 익명 타입은 이름을 직접 적을 수 없으므로 `var`가 반드시 필요하다.

다만 우변만 보고 타입과 단위를 알기 어려운 숫자나 API 반환값에서는 명시적 타입이 더 읽기 쉬울 수 있다. 특히 인터페이스 타입으로 변수를 선언해 구현 세부를 감추려는 의도가 있다면 `var`가 오히려 구체 타입을 고정할 수 있다.

```csharp
IEnumerable<Customer> customers = repository.Load(); // 추상화 의도를 드러냄
var lookup = customers.ToLookup(c => c.Region);       // 우변에서 타입과 목적이 명확함
```

판단 기준은 글자 수가 아니라 가독성이다. 우변으로 타입이 분명하고 타입 이름을 반복하는 선언에는 `var`를 우선하고, 변수의 의미를 타입이 설명해 주는 경우에는 명시적으로 적는다.

## [아이템 2: `const`보다 `readonly`가 좋다](https://blog.uniony.me/effective-cs-item2/)

`const`는 컴파일 시점 상수다. 이를 사용하는 다른 어셈블리에는 값이 그대로 삽입되므로, 라이브러리의 상수 값을 바꾼 뒤 소비자 어셈블리를 다시 빌드하지 않으면 이전 값이 남을 수 있다. 또한 기본 숫자, 문자열, 열거형 등 컴파일 시간에 결정 가능한 타입으로 제한된다.

`readonly` 필드는 런타임에 초기화되고 필드를 읽을 때 값을 참조하므로 버전 변경에 더 안전하다. 생성자에서 인스턴스별 값을 정할 수 있고, `static readonly`로 공유 값을 만들 수도 있다. 참조 타입의 `readonly`는 참조 자체의 재할당만 막을 뿐 객체 내부 변경까지 막지는 않는다는 점은 주의해야 한다.

```csharp
public static readonly TimeSpan DefaultTimeout = TimeSpan.FromSeconds(5);
public const int ProtocolVersion = 3; // 공개 계약이며 정말 변하지 않을 때
```

수학적 상수나 프로토콜 번호처럼 영구적인 컴파일 시간 계약에는 `const`가 어울린다. 향후 바뀔 수 있거나 계산·객체 생성이 필요한 값에는 `readonly`가 기본 선택이다.

## [아이템 3: 캐스트보다 `is`, `as`가 좋다](https://blog.uniony.me/effective-cs-item3/)

명시적 캐스트는 변환할 수 없을 때 예외를 발생시킨다. 반면 패턴을 사용한 `is`는 검사와 변수 선언을 한 번에 수행하고, `as`는 참조 변환에 실패하면 `null`을 반환한다. 실패가 정상적인 분기라면 예외를 제어 흐름으로 사용하는 것보다 패턴 검사가 명확하다.

```csharp
if (value is Customer customer)
{
    Process(customer);
}
```

검사 후 다시 캐스트하는 코드는 타입 검사를 두 번 표현하며, 그 사이 변수의 의미가 흐려진다. 현대 C#의 패턴 매칭은 null 검사도 함께 처리한다. `as`는 nullable 값 타입이나 참조 타입에서 사용할 수 있지만 사용자 정의 변환 연산자를 일반 캐스트와 똑같이 다루지는 않는다.

반대로 변환 실패가 프로그램 불변식 위반이라면 명시적 캐스트로 즉시 실패시키는 편이 낫다. 핵심은 “예외를 피하라”가 아니라 실패가 예상 가능한 입력인지, 결함인지 구분하는 것이다.

## [아이템 4: `string.Format()`을 보간 문자열로 대체하라](https://blog.uniony.me/effective-cs-item4/)

보간 문자열은 서식 자리표시자와 인수의 위치를 떨어뜨리지 않아 읽기 쉽다. `string.Format("{0}: {1}", name, score)`보다 `$"{name}: {score}"`가 값의 의미와 출력 위치를 한눈에 보여 준다. 컴파일러는 보간 문자열을 적절한 형식화 코드로 변환하며, 최신 런타임에서는 보간 문자열 핸들러를 통해 불필요한 문자열 생성도 줄일 수 있다.

서식 지정과 정렬도 그대로 사용할 수 있다.

```csharp
var line = $"{player.Name,-16} {player.Score,8:N0}";
```

로그처럼 출력 여부가 조건에 따라 결정되는 API에서는 전용 보간 문자열 핸들러가 지연 형식을 지원하는지 확인한다. 문자열 연결을 단순히 보기 좋게 바꾸는 것을 넘어, 서식과 문화권이 필요한 위치를 분명히 하는 것이 목적이다.

## [아이템 5: 문화권별 문자열에는 `FormattableString`을 사용하라](https://blog.uniony.me/effective-cs-item5/)

보간 문자열은 대상 타입에 따라 일반 `string`, `FormattableString`, 또는 다른 핸들러로 변환될 수 있다. `FormattableString`으로 받으면 원본 서식과 인수들이 분리된 상태로 유지되므로 나중에 특정 문화권을 선택해 렌더링할 수 있다.

```csharp
FormattableString message = $"Total: {amount:C}, Date: {createdAt:d}";
string userText = message.ToString(userCulture);
string logText = FormattableString.Invariant(message);
```

사용자 화면에는 사용자의 문화권을 적용하고, 로그·파일·네트워크처럼 기계가 다시 읽어야 하는 데이터에는 불변 문화권을 적용하는 식으로 목적을 나눈다. 숫자와 날짜를 문화권이 적용된 문자열로 만든 뒤 다시 파싱하는 구조는 피해야 한다. 저장과 전송에는 구조화된 원본 타입을 유지하고, 표현 경계에서만 문자열로 변환한다.

## [아이템 6: `nameof()` 연산자를 적극 활용하라](https://blog.uniony.me/effective-cs-item6/)

심볼 이름을 문자열 리터럴로 반복하면 이름 변경 시 컴파일러가 잘못된 문자열을 찾아주지 못한다. `nameof`는 타입, 멤버, 변수, 매개변수의 이름을 컴파일 시간 문자열로 만들기 때문에 리팩터링 도구와 함께 안전하게 변경된다.

```csharp
if (path is null)
    throw new ArgumentNullException(nameof(path));

PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof(DisplayName)));
```

`nameof`는 심볼의 단순 이름을 반환하며 객체 값을 평가하지 않는다. 로그 메시지, 예외 매개변수, 바인딩 속성 이름 등 “코드의 이름” 자체가 필요한 곳에 사용한다. 외부 프로토콜이나 DB 컬럼처럼 코드 리팩터링과 독립된 계약 이름은 별도 상수나 매핑으로 관리해야 한다.

## [아이템 7: 델리게이트로 콜백을 표현하라](https://blog.uniony.me/effective-cs-item7/)

델리게이트는 특정 매개변수와 반환 타입을 가진 메서드를 참조하는 타입 안전한 콜백이다. 콜백 하나만 필요할 때 인터페이스와 구현 클래스를 새로 만드는 것보다 결합도가 낮고 의도를 간단히 표현한다. `Action`, `Func`, `Predicate` 같은 표준 델리게이트를 우선하면 새로운 타입 선언도 줄어든다.

```csharp
public Task RetryAsync(Func<CancellationToken, Task> operation,
                       CancellationToken cancellationToken);
```

델리게이트는 여러 메서드를 결합할 수 있다. 멀티캐스트 델리게이트는 등록 순서대로 호출되지만 중간 호출에서 예외가 나면 뒤 호출이 실행되지 않을 수 있고, 반환값이 있다면 마지막 호출의 값만 관찰하기 쉽다. 여러 구독자에게 알리는 목적이라면 직접 델리게이트 필드를 공개하기보다 이벤트로 캡슐화하는 편이 안전하다.

콜백이 단순 동작 주입인지, 구현 객체의 수명과 여러 기능을 함께 요구하는 계약인지 구분해야 한다. 후자라면 인터페이스가 더 명확하다.

## [아이템 8: 이벤트 호출에는 null 조건 연산자를 사용하라](https://blog.uniony.me/effective-cs-item8/)

구독자가 없는 이벤트는 `null`이다. 전통적으로 지역 변수에 이벤트를 복사한 뒤 null을 확인하고 호출했는데, 이는 검사와 호출 사이에 다른 스레드가 구독을 해제하는 경쟁을 줄이기 위한 패턴이었다. null 조건 연산자는 수신자를 한 번 평가하므로 같은 의도를 간결하게 표현한다.

```csharp
public event EventHandler<ScoreChangedEventArgs>? ScoreChanged;

protected virtual void OnScoreChanged(ScoreChangedEventArgs args) =>
    ScoreChanged?.Invoke(this, args);
```

이 패턴이 이벤트 처리기 내부의 스레드 안전성까지 보장하는 것은 아니다. 호출 직전에 해제된 처리기가 한 번 더 실행될 수 있으므로 구독 객체는 그런 호출을 견딜 수 있어야 한다. 이벤트는 선언한 타입만 발생시키도록 `event` 키워드로 외부 직접 호출과 대입을 막는다.

## [아이템 9: 박싱과 언박싱을 최소화하라](https://blog.uniony.me/effective-cs-item9/)

값 타입을 `object`나 구현 인터페이스 타입으로 취급할 때 박싱이 일어나면 힙에 객체가 만들어지고 값이 복사된다. 다시 값 타입으로 꺼낼 때는 정확한 원래 타입으로 언박싱해야 한다. 반복 루프에서 박싱이 누적되면 할당량과 GC 부담이 커지고, 복사본을 수정해도 원래 값에 반영되지 않는 혼란이 생길 수 있다.

제네릭 컬렉션과 제네릭 인터페이스를 사용하면 대부분의 박싱을 피할 수 있다.

```csharp
var values = new List<int>();       // ArrayList보다 안전하고 박싱이 없음
bool equal = value.Equals(other);   // 구현에 따라 박싱 여부 확인
```

문자열 형식화, 인터페이스 호출, 비제네릭 API 경계에서도 박싱이 숨어 있을 수 있다. 다만 추측으로 코드를 복잡하게 만들기보다 프로파일러의 할당 데이터를 확인하고 반복 빈도가 높은 경로부터 개선한다.

## [아이템 10: 베이스 클래스 변경 대응에만 `new` 한정자를 사용하라](https://blog.uniony.me/effective-cs-item10/)

파생 클래스에서 베이스 클래스의 비가상 멤버와 같은 이름을 선언하면 오버라이드가 아니라 이름 숨김이 일어난다. 어떤 메서드가 호출되는지는 객체의 실제 타입보다 변수를 바라보는 정적 타입에 좌우되어 다형성을 기대한 독자에게 혼란을 준다.

```csharp
Base value = new Derived();
value.Render(); // Derived의 new Render가 아니라 Base.Render 호출 가능
```

의도적으로 숨기려면 `new`를 붙여 컴파일러 경고를 없앨 수 있지만, 새 설계에서 이를 다형성 수단으로 사용해서는 안 된다. 가상 동작이 필요하면 베이스에 `virtual` 또는 `abstract`를 두고 파생 타입에서 `override`한다.

`new` 한정자의 현실적인 용도는 외부 베이스 클래스가 업그레이드되면서 우연히 파생 클래스와 같은 이름의 멤버를 추가했을 때, 기존 의미를 유지하며 충돌 의도를 명시하는 호환 조치다. 가능하면 이름을 바꾸거나 구조를 정리하는 편이 장기적으로 낫다.

## 코드로 차이를 확인하기

### `var`는 컴파일 시점에 타입이 결정된다

```csharp
var count = 10;                    // 컴파일 시 int
var names = new List<string>();    // 컴파일 시 List<string>

// count = "ten";                 // 컴파일 오류
Console.WriteLine(count.GetType()); // System.Int32
```

`var` 변수의 타입은 실행 중에 바뀌지 않는다. 우변이 `new CustomerRepository()`라면 변수도 구체 타입으로 추론되므로, 인터페이스 경계를 강조하려는 경우에는 `ICustomerRepository repository = ...`처럼 명시하는 편이 낫다.

### 공개 `const`의 버전 문제

```csharp
// Library.dll 버전 1
public static class Limits
{
    public const int MaxPlayers = 100;
    public static readonly int DefaultPlayers = 100;
}
```

```text
App.dll 컴파일
 ├─ Limits.MaxPlayers 값 100이 App.dll 코드에 삽입됨
 └─ Limits.DefaultPlayers는 실행 시 Library.dll 필드를 읽음

Library.dll만 새 버전으로 교체
 ├─ const를 200으로 바꿔도 App.dll은 여전히 100을 사용할 수 있음
 └─ readonly를 200으로 바꾸면 App.dll은 새 필드 값을 읽음
```

외부 어셈블리가 참조하는 공개 값이 바뀔 가능성이 있으면 `static readonly`가 버전 변경에 안전하다.

### 패턴 검사와 사용자 정의 변환

```csharp
public sealed class UserId
{
    public string Value { get; }
    public UserId(string value) => Value = value;

    public static explicit operator UserId(string value) => new(value);
}

object value = "player-42";

// value is UserId는 false다. 패턴 검사는 사용자 정의 변환을 실행하지 않는다.
if (value is string text)
{
    UserId id = (UserId)text; // 의도적으로 정의한 명시적 변환
}
```

`is`와 `as`는 런타임 타입 호환성을 검사하는 도구이며, 임의의 사용자 정의 변환을 모두 시도하는 문법이 아니다. 데이터 변환과 타입 검사를 같은 것으로 취급하지 않는다.

### 멀티캐스트 델리게이트와 예외

```csharp
Action handlers = () => Console.WriteLine("first");
handlers += () => throw new InvalidOperationException("second failed");
handlers += () => Console.WriteLine("third");

foreach (Action handler in handlers.GetInvocationList())
{
    try { handler(); }
    catch (Exception ex) { Console.Error.WriteLine(ex.Message); }
}
```

`handlers()`를 한 번 호출하면 두 번째 처리기의 예외 때문에 세 번째 처리기가 실행되지 않는다. 구독자별 실패를 격리해야 하는 시스템이라면 호출 목록을 순회하며 정책에 따라 오류를 기록하거나 모아야 한다.

### 박싱 할당 관찰

```csharp
long before = GC.GetAllocatedBytesForCurrentThread();

object boxed = 42;   // int 값을 담는 힙 객체 생성
int number = (int)boxed;

long allocated = GC.GetAllocatedBytesForCurrentThread() - before;
Console.WriteLine($"Allocated: {allocated} bytes, value: {number}");
```

측정 자체도 할당에 영향을 줄 수 있으므로 실제 벤치마크에는 BenchmarkDotNet 같은 도구가 적합하다. 이 예제의 목적은 값 타입을 `object`로 변환하는 순간 별도 객체가 필요하다는 점을 확인하는 것이다.

### `new`와 `override`의 호출 차이

```csharp
class Base
{
    public void Hidden() => Console.WriteLine("Base.Hidden");
    public virtual void Polymorphic() => Console.WriteLine("Base.Polymorphic");
}

class Derived : Base
{
    public new void Hidden() => Console.WriteLine("Derived.Hidden");
    public override void Polymorphic() => Console.WriteLine("Derived.Polymorphic");
}

Base value = new Derived();
value.Hidden();       // Base.Hidden: 정적 타입으로 선택
value.Polymorphic();  // Derived.Polymorphic: 실제 타입으로 디스패치
```

이름 숨김은 다형성이 아니다. 새 설계에서 파생 동작을 기대한다면 `virtual`과 `override`로 계약을 명시한다.

## 복습할 내용

- `var`, `const`, `readonly`가 각각 컴파일 시점과 런타임에 어떤 정보를 고정하는지 설명한다.
- 타입 변환 실패가 정상 분기인지 결함인지에 따라 `is`와 캐스트를 선택한다.
- 델리게이트와 이벤트, 인터페이스가 적합한 콜백 사례를 각각 하나씩 설계한다.
- 작은 벤치마크로 제네릭 컬렉션과 비제네릭 컬렉션의 할당량을 비교한다.
