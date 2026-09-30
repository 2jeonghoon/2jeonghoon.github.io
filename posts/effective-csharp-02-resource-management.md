---
title: "Effective C# 공부 02: 객체 초기화와 리소스 관리"
description: "GC와 비관리 리소스, 멤버·정적 초기화, 생성자 체이닝, 객체 할당, 가상 호출과 표준 Dispose 패턴까지 아이템 11~17을 상세히 정리한 학습 노트입니다."
date: "2026-09-28"
category: "C#"
subcategory: "Effective C#"
tags: ["C#", ".NET", "Effective C#", "Resource Management"]
featured: false
draft: true
aiGenerated: true
---

.NET의 가비지 컬렉터는 메모리를 자동으로 회수하지만 모든 종류의 자원을 자동으로 적절한 시점에 정리해 주는 것은 아니다. 또한 객체의 생성 과정에는 필드 초기화, 생성자 체이닝, 정적 초기화처럼 순서에 민감한 단계가 있다. 이 단원은 객체의 시작과 끝을 예측 가능하게 만드는 방법을 다룬다.

## 아이템 11: .NET 리소스 관리에 대한 이해

관리 힙의 객체는 더 이상 도달할 수 없을 때 GC의 수집 대상이 된다. 개발자가 직접 `delete`하지 않아도 되지만, 언제 수집될지는 보장되지 않는다. 세대별 GC는 대부분의 객체가 짧게 산다는 가정 아래 새 객체를 자주 검사하고 오래 살아남은 객체를 상위 세대로 이동시킨다. 따라서 불필요하게 객체 수명을 늘리면 상위 세대 수집 비용이 커질 수 있다.

파일 핸들, 소켓, 네이티브 메모리, 그래픽 자원 같은 비관리 리소스는 메모리와 달리 사용이 끝나는 즉시 반환해야 할 수 있다. 이런 자원을 가진 타입은 `IDisposable`을 구현하고 소비자는 `using`으로 결정적 정리를 수행한다. 파이널라이저는 객체가 수집될 때를 기다리므로 반환 시점이 늦고 GC 처리 비용도 늘어난다.

```csharp
using var stream = File.OpenRead(path);
// 범위를 벗어나면 예외 여부와 관계없이 Dispose 호출
```

GC는 메모리 안전망이고 `Dispose`는 자원 수명 계약이다. 둘을 같은 것으로 생각하지 않는 것이 출발점이다.

## 아이템 12: 할당 구문보다 멤버 초기화 구문이 좋다

인스턴스 필드 초기화 구문은 모든 생성자에서 공통으로 필요한 기본 상태를 한곳에 둔다. 생성자가 추가될 때 특정 필드 초기화를 빠뜨릴 가능성을 줄이며 선언 가까이에서 기본값을 확인할 수 있다.

```csharp
public sealed class Session
{
    private readonly List<Message> messages = new();
    private DateTime lastSeen = DateTime.UtcNow;
}
```

필드는 먼저 언어 기본값으로 초기화된 뒤 명시적 필드 초기화가 실행되고 생성자 본문이 실행된다. 이미 기본값인 `0`, `false`, `null`을 다시 대입하는 코드는 의미가 없다. 반대로 초기화에 생성자 매개변수가 필요하거나, 예외를 세밀하게 다뤄야 하거나, 같은 객체를 생성자에서 다른 값으로 즉시 덮어쓴다면 생성자에서 처리하는 편이 낫다.

초기화 식에 복잡한 I/O나 가상 동작을 넣지 않는다. 선언부는 빠르고 실패 가능성이 낮은 기본 상태를 만드는 데 집중한다.

## 아이템 13: 정적 클래스 멤버를 올바르게 초기화하라

정적 필드는 타입 전체에서 하나만 존재하며 타입이 처음 사용되는 시점과 관련해 초기화된다. 간단한 생성은 정적 필드 초기화 식으로, 여러 필드 사이의 순서나 오류 처리가 필요한 경우에는 정적 생성자로 모을 수 있다.

```csharp
public static class CodecRegistry
{
    private static readonly IReadOnlyDictionary<string, ICodec> codecs =
        BuildCodecs();
}
```

정적 생성자는 런타임이 한 번만 실행하도록 보장한다. 그러나 여기서 예외가 발생하면 타입 초기화가 실패한 상태가 되고 이후 사용도 계속 실패할 수 있다. 네트워크 연결이나 환경에 따라 실패할 수 있는 무거운 작업을 정적 생성자에 넣으면 복구와 테스트가 어렵다.

초기화 순서는 소스에 보이는 정적 필드 순서와 생성자 실행을 고려해야 한다. 서로가 서로의 초기화에 의존하는 순환 구조는 피한다. 외부 자원은 명시적인 초기화 메서드나 DI 컨테이너의 수명 관리로 옮기는 편이 낫다.

## 아이템 14: 초기화 코드 중복을 최소화하라

여러 생성자가 같은 필드를 각자 초기화하면 한 생성자를 수정할 때 다른 경로를 빠뜨리기 쉽다. `this(...)` 생성자 체이닝으로 하나의 주 생성자에 불변식 검증과 실제 초기화를 모은다.

```csharp
public Player(string name)
    : this(name, level: 1, createdAt: DateTime.UtcNow) { }

public Player(string name, int level, DateTime createdAt)
{
    Name = string.IsNullOrWhiteSpace(name)
        ? throw new ArgumentException("Name is required", nameof(name))
        : name;
    Level = level;
    CreatedAt = createdAt;
}
```

기본 매개변수도 호출 형태를 줄일 수 있지만 기본값은 호출자 코드에 기록되는 계약이 될 수 있고, 여러 매개변수 조합이 의미를 흐릴 수 있다. 의미가 다른 생성 방식에는 이름 있는 정적 팩터리 메서드가 더 읽기 쉽다.

공통 로직을 private 메서드로 옮기는 것보다 생성자 체이닝이 유리한 이유는 객체 초기화 순서를 언어가 보장하고, 필드가 여러 번 기본화되거나 재할당되는 일을 줄이기 때문이다. 모든 생성 경로가 같은 불변식을 통과하는지 확인한다.

## 아이템 15: 불필요한 객체를 만들지 말라

짧게 사는 작은 객체의 할당은 .NET에서 매우 빠르지만, 높은 빈도로 반복되면 수집 횟수와 일시 정지가 늘어난다. 특히 게임 루프, 직렬화, 로그처럼 초당 수천 번 실행되는 경로에서 임시 문자열과 컬렉션을 만드는 습관은 측정 가능한 비용이 된다.

자주 사용하는 객체를 필드나 캐시로 재사용할 수 있지만 재사용 자체도 상태 초기화, 스레드 안전성, 메모리 장기 보유라는 비용이 있다. 서비스 객체처럼 수명이 명확한 의존성은 DI를 통해 재사용하고, 값이 작고 일시적인 객체는 자연스럽게 할당하는 편이 단순하다. 대형 배열처럼 비용이 큰 자원은 풀을 고려할 수 있다.

불변 문자열을 반복 연결하면 중간 문자열이 계속 생긴다. 반복 횟수가 많은 조립에는 `StringBuilder`를 사용한다.

```csharp
var builder = new StringBuilder(capacity: 256);
foreach (var entry in entries)
    builder.Append(entry.Name).Append(':').AppendLine(entry.Value);
```

최적화는 반드시 할당 프로파일을 근거로 한다. 객체를 무조건 오래 보관하면 메모리와 결합도가 오히려 커질 수 있다.

## 아이템 16: 생성자에서는 가상 함수를 호출하지 말라

베이스 클래스 생성자가 실행되는 동안 파생 클래스의 필드와 생성자 본문은 아직 완전히 초기화되지 않았다. 이때 가상 메서드를 호출하면 런타임은 파생 클래스의 오버라이드를 선택할 수 있고, 오버라이드는 준비되지 않은 필드에 접근하게 된다.

```csharp
public abstract class Base
{
    protected Base() => Initialize(); // 위험
    protected abstract void Initialize();
}
```

이 문제는 단순한 null 예외뿐 아니라 기본값을 정상 값으로 오해하거나, 생성 중인 `this`가 외부 이벤트에 등록되어 다른 코드에 노출되는 문제로 이어진다. 생성자는 객체의 불변식을 완성하는 데 집중하고, 파생 타입의 동작이 필요한 초기화는 생성 완료 후 명시적 메서드나 팩터리에서 수행한다.

비가상 private 메서드로 공통 초기화를 수행하는 것은 괜찮지만 그 메서드가 다시 가상 멤버나 파생 타입 상태에 접근하지 않는지 확인해야 한다.

## 아이템 17: 표준 Dispose 패턴을 구현하라

비관리 리소스를 직접 소유하는 타입은 `IDisposable`을 통해 결정적 정리를 제공해야 한다. 관리 자원만 가진 타입은 보통 그 자원의 `Dispose`를 호출하면 충분하며 파이널라이저가 필요하지 않다. 파이널라이저는 직접 비관리 리소스를 소유해 소비자가 `Dispose`를 빠뜨렸을 때의 마지막 안전망으로만 사용한다.

고전적인 상속 가능한 패턴은 공개 `Dispose()`, `Dispose(bool disposing)`, 필요할 때의 파이널라이저, 중복 정리를 막는 플래그로 구성된다.

```csharp
public class NativeBuffer : IDisposable
{
    private IntPtr handle;
    private bool disposed;

    public void Dispose()
    {
        Dispose(true);
        GC.SuppressFinalize(this);
    }

    protected virtual void Dispose(bool disposing)
    {
        if (disposed) return;

        if (disposing)
        {
            // 소유한 관리 IDisposable 정리
        }

        if (handle != IntPtr.Zero)
        {
            ReleaseNative(handle);
            handle = IntPtr.Zero;
        }

        disposed = true;
    }

    ~NativeBuffer() => Dispose(false);
}
```

실무에서는 `SafeHandle`을 사용해 네이티브 핸들을 감싸면 파이널라이저의 복잡성을 프레임워크에 맡길 수 있다. `Dispose`는 여러 번 호출돼도 안전해야 하며, 정리 뒤 멤버 사용에는 `ObjectDisposedException`을 고려한다. 파이널라이저 경로에서는 다른 관리 객체의 상태를 신뢰할 수 없고 예외가 프로세스에 치명적일 수 있으므로 비관리 자원 해제 외의 작업을 하지 않는다.

상속이 필요 없는 타입은 `sealed`로 만들면 정리 패턴이 단순해진다. 비동기 해제가 필요하면 `IAsyncDisposable`과 `await using`을 별도 계약으로 제공한다.

## 코드와 수명 흐름으로 확인하기

### GC가 객체를 찾는 방식

```text
GC Root
 ├─ 실행 중 스레드의 지역 변수 ──> Session ──> Player
 ├─ static 필드 ─────────────────> Cache ──> Entry
 └─ 네이티브 핸들 테이블 ─────────> ManagedObject

어떤 Root에서도 도달할 수 없는 객체
 └─ 다음 적절한 GC에서 회수 대상
```

변수가 블록을 벗어났다는 사실만으로 즉시 수집되는 것은 아니며, JIT가 마지막 사용 시점을 더 일찍 판단할 수도 있다. 반대로 이벤트나 정적 캐시에서 참조하면 의도보다 오래 살아남는다.

### 필드와 생성자 실행 순서

```csharp
class Base
{
    private readonly Marker baseField = new("Base field");
    protected Base() => Console.WriteLine("Base constructor");
}

class Derived : Base
{
    private readonly Marker derivedField = new("Derived field");
    public Derived() => Console.WriteLine("Derived constructor");
}
```

```text
인스턴스 메모리 기본값 설정
→ 파생 타입 필드 초기화
→ 베이스 타입 필드 초기화
→ 베이스 생성자 본문
→ 파생 생성자 본문
```

정확한 순서를 암기하는 것보다 생성 도중 가상 호출이나 `this` 노출을 피하고, 각 생성자가 자신의 단계에서 완성되지 않은 파생 상태를 사용하지 않는 것이 중요하다.

### 실패 가능한 정적 자원은 지연 초기화

```csharp
public static class Configuration
{
    private static readonly Lazy<AppSettings> settings =
        new(Load, LazyThreadSafetyMode.ExecutionAndPublication);

    public static AppSettings Current => settings.Value;

    private static AppSettings Load() => AppSettings.ReadFromEnvironment();
}
```

`Lazy<T>`는 첫 사용까지 생성을 늦추고 스레드 안전한 단일 초기화를 제공할 수 있다. 다만 기본 모드에서는 초기화 예외가 캐시될 수 있으므로 재시도가 필요한 외부 연결을 영구 정적 값으로 감추지 않는다.

### 생성자에서 가상 메서드를 호출하면 생기는 문제

```csharp
abstract class BaseWidget
{
    protected BaseWidget() => PrintState();
    protected abstract void PrintState();
}

sealed class PlayerWidget : BaseWidget
{
    private readonly string name;

    public PlayerWidget(string name) => this.name = name;

    protected override void PrintState() =>
        Console.WriteLine(name.Length); // 아직 name이 대입되기 전 호출될 수 있음
}
```

가상 디스패치는 파생 구현을 호출하지만 파생 생성자 본문은 아직 실행되지 않았다. 필요한 값을 베이스 생성자 인수로 전달하거나 생성 완료 후 별도 초기화 단계를 호출한다.

### `SafeHandle`로 네이티브 핸들 감싸기

```csharp
sealed class FileHandle : SafeHandle
{
    private FileHandle() : base(IntPtr.Zero, ownsHandle: true) { }

    public override bool IsInvalid => handle == IntPtr.Zero || handle == new IntPtr(-1);

    protected override bool ReleaseHandle() => NativeMethods.CloseHandle(handle);
}
```

네이티브 핸들을 직접 `IntPtr` 필드와 파이널라이저로 관리하기보다 `SafeHandle`을 사용하면 위험한 종료 경합과 파이널라이저 로직을 프레임워크에 맡길 수 있다. 이 핸들을 소유한 상위 객체는 `SafeHandle.Dispose()`를 호출한다.

### 동기·비동기 정리 경계

```csharp
await using var connection = await OpenConnectionAsync(cancellationToken);
await connection.SendAsync(message, cancellationToken);
```

`IAsyncDisposable`은 네트워크 종료나 버퍼 flush처럼 비동기 대기가 필요한 정리에 사용한다. 단순 메모리 필드를 비우기 위해 비동기 정리를 도입하지 않으며, 타입이 동기·비동기 정리를 모두 제공한다면 호출자가 어떤 계약을 선택해야 하는지 문서화한다.

## 복습할 내용

- 관리 메모리 회수와 비관리 리소스 해제가 왜 다른 수명 모델을 갖는지 설명한다.
- 필드 초기화, 베이스 생성자, 파생 생성자의 실행 순서를 작은 코드로 확인한다.
- 생성자 체이닝과 정적 팩터리 중 어느 방식이 호출 의도를 더 잘 표현하는지 비교한다.
- `SafeHandle`, `IDisposable`, `IAsyncDisposable`이 각각 필요한 사례를 설계한다.
