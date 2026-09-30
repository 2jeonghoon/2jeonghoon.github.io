---
title: "Effective C# 공부 04: LINQ와 함수형 기법을 안전하게 사용하기"
description: "이터레이터와 LINQ 조합, 지연·즉시 평가, 람다와 예외, 클로저 수명, IQueryable 번역, Single과 First까지 아이템 29~44를 상세히 정리한 학습 노트입니다."
date: "2026-09-28"
category: "C#"
subcategory: "Effective C#"
tags: ["C#", ".NET", "Effective C#", "LINQ"]
featured: false
draft: true
aiGenerated: true
---

LINQ는 반복문을 짧게 쓰는 문법이 아니라 데이터 처리 단계를 조합하는 모델이다. 시퀀스가 언제 열거되고, 연산이 메모리에서 실행되는지 외부 제공자에게 번역되는지, 람다가 어떤 변수를 얼마나 오래 붙잡는지를 이해해야 정확성과 성능을 함께 지킬 수 있다.

## 아이템 29: 컬렉션보다 이터레이터를 반환하라

메서드가 결과 전체를 미리 만들어 `List<T>`로 반환하면 호출자가 일부만 필요해도 모든 계산과 할당이 발생한다. `IEnumerable<T>`와 `yield return`을 사용하면 소비자가 열거하는 만큼만 생성하고 LINQ 연산과 이어 붙일 수 있다.

이터레이터는 매 열거 시 다시 실행될 수 있다. 외부 상태가 바뀌거나 I/O를 포함하면 결과와 비용도 달라질 수 있으므로 이를 API 계약에 명시한다. 결과 스냅샷, 인덱스 접근, 반복 열거의 안정성이 필요하면 실제 컬렉션을 반환하는 편이 낫다. 반환 타입은 구현 편의가 아니라 소비자가 기대할 수 있는 기능을 나타내야 한다.

## 아이템 30: 루프보다 쿼리 구문을 우선하라

필터링, 변환, 정렬, 그룹화 같은 데이터 흐름은 LINQ로 표현하면 “어떻게 순회할지”보다 “어떤 결과가 필요한지”가 드러난다. 각 연산을 독립적으로 조합할 수 있고 평가 시점도 늦출 수 있다.

```csharp
var names = players
    .Where(p => p.IsOnline)
    .OrderByDescending(p => p.Score)
    .Select(p => p.Name);
```

상태를 여러 번 변경하거나 조기 탈출과 복잡한 오류 처리가 핵심인 알고리즘은 명시적 루프가 더 읽기 쉽다. LINQ 체인이 반복 열거, 중간 할당, 숨은 고비용 호출을 만드는지도 확인한다. 선언적 표현이 의도를 개선할 때 사용하고, 모든 루프를 기계적으로 바꾸지는 않는다.

## 아이템 31: 시퀀스에 조합 가능한 API를 작성하라

시퀀스 변환 메서드가 입력 전체를 소비하고 목록으로 고정하면 다음 단계와의 조합성이 줄어든다. `IEnumerable<T>`를 받아 `IEnumerable<TResult>`를 반환하고 한 항목씩 처리하면 필터와 변환을 파이프라인처럼 이어 붙일 수 있다.

조합 가능한 API는 입력 순서를 보존하는지, 한 번만 열거하는지, 예외가 열거 시점에 발생하는지 명확해야 한다. 메서드 안에서 소스의 `Count()`, `Any()`, 실제 순회를 별도로 수행하면 한 번만 읽을 수 있는 소스를 깨뜨릴 수 있다. 가능하면 단일 패스로 구현하고 구체화는 최종 소비자가 결정하게 한다.

## 아이템 32: 작업과 순회 방식을 분리하라

항목에 수행할 동작은 `Action<T>`, 선택 조건은 `Predicate<T>`나 `Func<T, bool>`, 변환은 `Func<T, TResult>`로 표현할 수 있다. 순회 순서, 건너뛰기, 중단, 트리 탐색 같은 메커니즘과 항목별 정책을 분리하면 같은 순회 코드를 다양한 작업에 재사용할 수 있다.

다만 `Action<T>`에 외부 상태 변경을 과도하게 넣으면 데이터 흐름이 보이지 않고 병렬화도 어려워진다. 값을 계산하는 작업은 반환값이 있는 순수 함수로 표현하고, 파일 쓰기나 상태 변경 같은 부수 효과는 경계에서 명시적으로 실행한다.

## 아이템 33: 필요한 시점에 필요한 요소를 생성하라

`yield return`은 호출 시 전체 결과를 만들지 않고 열거자가 다음 항목을 요청할 때 실행을 이어간다. 무한 시퀀스, 큰 파일, 계산 비용이 높은 후보 생성에서 특히 유용하며 `Take`, `First`, `Any`와 결합하면 필요한 지점에서 멈출 수 있다.

```csharp
IEnumerable<long> PowersOfTwo()
{
    for (long value = 1; value > 0; value *= 2)
        yield return value;
}
```

지연 생성 중에는 입력 스트림이나 DB 연결이 열거가 끝날 때까지 필요할 수 있다. 열거자가 중간에 중단돼도 `finally`와 `using`이 정리되도록 작성하고, 객체 수명이 긴 이터레이터에 값비싼 자원을 무심코 보관하지 않는다.

## 아이템 34: 함수를 매개변수로 받아 결합도를 낮추라

상속은 상태와 여러 동작을 함께 확장하는 계약이고, 인터페이스는 관련 기능 묶음을 표현한다. 한 알고리즘의 비교·선택·변환 규칙 하나만 바꾸려는 경우에는 함수를 매개변수로 받는 편이 더 작은 결합을 만든다.

```csharp
public static Player? Best(
    IEnumerable<Player> players,
    Func<Player, int> scoreSelector) =>
    players.MaxBy(scoreSelector);
```

델리게이트가 너무 많아 서로 지켜야 할 규칙이나 공유 상태가 생기면 전략 인터페이스가 낫다. 함수 주입은 작은 정책에, 인터페이스는 수명과 여러 기능을 가진 협력 객체에 사용한다.

## 아이템 35: 확장 메서드를 오버로드하지 말라

확장 메서드는 정적 타입과 현재 가져온 네임스페이스를 기준으로 컴파일 시점에 선택된다. 같은 이름의 여러 확장을 추가하면 호출자가 `using`을 바꾸거나 변수 타입을 일반화했을 때 다른 메서드가 선택될 수 있다. 인스턴스 멤버가 추가되면 확장 메서드보다 우선한다.

콘솔용과 XML용 `Format`처럼 의미가 다른 기능을 같은 이름의 확장 오버로드로 숨기기보다 `ToConsoleText`, `ToXml`처럼 의도를 이름에 넣는다. 타입별 다형 동작이 필요하다면 확장 메서드가 아니라 가상 멤버, 인터페이스, 포맷터 객체를 사용한다.

## 아이템 36: 쿼리 표현식과 메서드 구문의 대응을 이해하라

쿼리 표현식은 컴파일러가 `Where`, `Select`, `SelectMany`, `OrderBy`, `ThenBy`, `GroupBy`, `Join`, `GroupJoin` 같은 메서드 호출로 변환한다. 이 대응을 알면 쿼리 문법에 없는 연산을 메서드 체인으로 섞고, 복잡한 쿼리가 실제로 어떤 호출을 만드는지 추론할 수 있다.

여러 `from`은 대개 `SelectMany`로 평탄화되고, `orderby`의 두 번째 키는 새 `OrderBy`가 아니라 `ThenBy`가 된다. `join ... into`는 그룹 조인의 의미를 가진다. 쿼리 구문과 메서드 구문 중 더 읽기 쉬운 쪽을 선택하되, 실행 모델은 결국 동일한 확장 메서드 계약임을 기억한다.

## 아이템 37: 즉시 평가보다 지연 평가를 우선하라

`Where`와 `Select` 같은 연산은 보통 쿼리 객체만 만들고 열거 시 실제 작업을 수행한다. 이후 조건을 더 붙여도 하나의 파이프라인으로 처리할 수 있고, 필요한 항목만 계산할 수 있다.

지연 평가는 원본 데이터의 현재 상태를 매번 반영하며 반복 열거 때 비용도 반복된다. 한 시점의 결과를 보존하거나 여러 번 사용할 계획이라면 `ToList`, `ToArray`, `ToDictionary`로 경계를 명시한다. “항상 지연”이 아니라 데이터 변경과 비용을 고려해 구체화 시점을 의식적으로 선택한다.

## 아이템 38: 메서드보다 람다 표현식이 나을 수 있다

작고 한 번만 쓰는 변환 규칙은 람다를 호출 위치에 두면 쿼리 의도가 이어져 보인다. 특히 `IQueryable<T>`에서는 람다가 식 트리로 만들어져 SQL 같은 외부 언어로 번역될 수 있으므로, 별도 C# 메서드 호출보다 제공자가 분석하기 쉽다.

반복되는 람다나 복잡한 분기, 독립 테스트가 필요한 로직은 이름 있는 메서드로 추출한다. LINQ to Objects에서는 일반 메서드도 실행할 수 있지만 LINQ 제공자는 임의의 .NET 메서드를 번역하지 못할 수 있다. 실행 대상에 따라 표현 가능한 연산을 구분한다.

## 아이템 39: 함수와 액션 안에서 예외를 피하라

시퀀스를 처리하는 중간 함수가 예외를 던지면 앞선 항목에 적용된 부수 효과만 남고 뒤 항목은 처리되지 않는 부분 완료 상태가 된다. 지연 평가에서는 쿼리를 만든 위치가 아니라 나중의 열거 위치에서 예외가 발생해 원인 추적도 어려워진다.

입력 검증은 가능하면 열거 전에 수행하고, 항목별 실패가 예상된다면 `TryParse`처럼 성공 여부를 값으로 표현한다. 모든 예외를 삼키라는 뜻은 아니다. 회복할 수 없는 결함은 전파하되, 상태 변경을 포함한 파이프라인은 먼저 계산을 완료한 뒤 한 번에 반영하거나 보상 전략을 마련한다.

## 아이템 40: 지연 수행과 즉시 수행을 구분하라

선언적 쿼리는 수행할 계산을 기술하고, 열거가 실행을 시작한다. `ToList`, `Count`, `First`, `Single`, `Any`, `Max` 같은 터미널 연산은 결과를 요구하므로 즉시 소스를 소비한다. 변수에 쿼리를 저장했다는 사실만으로 데이터가 읽힌 것은 아니다.

이 구분은 오류 발생 위치, DB 연결 수명, 로그 타이밍, 성능 측정에 직접 영향을 준다. 메서드가 지연 시퀀스를 반환한다면 인수 검증 코드를 일반 메서드 바깥쪽에 두고 실제 이터레이터를 내부 함수로 분리해 호출 시 즉시 검증하는 패턴도 고려한다.

## 아이템 41: 값비싼 리소스를 캡처하지 말라

람다가 지역 변수를 캡처하면 컴파일러는 변수를 보관할 숨은 객체를 만들 수 있다. 델리게이트가 살아 있는 동안 캡처된 객체도 도달 가능한 상태로 남는다. 큰 그래프, DB 컨텍스트, 스트림처럼 값비싼 자원을 캡처하면 원래 블록을 벗어난 뒤에도 수명이 연장된다.

이벤트에 캡처 람다를 등록하면 구독 해제에 사용할 동일한 델리게이트 참조를 잃기 쉽다. 자원은 필요한 범위 안에서 열고 닫으며 람다에는 식별자나 불변 값처럼 작은 데이터만 전달한다. 캡처가 필요 없는 람다는 `static` 람다로 표시하면 컴파일러가 실수로 외부 변수를 참조하는 것을 막는다.

## 아이템 42: `IEnumerable<T>`와 `IQueryable<T>`를 구분하라

`IEnumerable<T>`의 람다는 컴파일된 델리게이트로 현재 프로세스에서 실행된다. `IQueryable<T>`의 람다는 식 트리로 표현되어 제공자가 SQL 같은 다른 질의로 번역한다. API 모양은 비슷하지만 지원 연산, 실행 위치, 성능이 크게 다르다.

너무 일찍 `AsEnumerable()`을 호출하면 이후 필터가 메모리에서 실행되어 많은 데이터를 가져올 수 있다. 반대로 제공자가 번역하지 못하는 메서드를 쿼리에 넣으면 런타임 오류가 날 수 있다. DB에서 줄일 수 있는 필터·정렬·투영을 먼저 수행하고, 필요한 데이터만 가져온 뒤 로컬 연산으로 전환한다. 저장소가 `IQueryable`을 그대로 노출하면 호출자가 예측 불가능한 쿼리를 만들 수 있다는 API 설계 문제도 고려한다.

## 아이템 43: `Single()`과 `First()`로 결과 개수의 의미를 강제하라

`First`는 하나 이상 중 첫 항목이 필요하다는 계약이고, `Single`은 정확히 하나만 존재해야 한다는 불변식을 검사한다. `FirstOrDefault`와 `SingleOrDefault`는 빈 결과를 허용하지만, 참조 타입의 `null`이나 값 타입의 기본값이 실제 데이터와 구분되지 않을 수 있다.

유일해야 하는 사용자 이메일 조회에 `First`를 쓰면 중복 데이터 결함을 숨긴다. 반대로 정렬된 최신 기록 하나를 고르는 작업에 `Single`을 쓰면 정상적인 여러 결과를 오류로 만든다. 메서드 선택으로 데이터의 기대 개수를 표현하고 DB의 고유 제약 조건도 함께 둔다.

## 아이템 44: 바인딩된 변수를 수정하지 말라

클로저가 캡처하는 것은 순간의 값이 아니라 변수 자체다. 람다를 만든 뒤 외부에서 변수를 바꾸면 이후 람다 실행은 새 값을 본다. 반복문에서 여러 람다가 같은 변수를 공유하거나, 지연 실행 전에 기준 값이 바뀌면 예상과 다른 결과가 생긴다.

필요한 값을 별도 지역 변수에 복사하고 이후 변경하지 않는 방식으로 의도를 고정한다. 가능하면 불변 입력을 매개변수로 전달하고 상태 변경이 필요한 경우에는 이를 소유하는 명시적 객체로 모델링한다. 캡처된 변수의 수정은 실행 시점과 상태 의존성을 숨기므로 동시성 코드에서는 특히 위험하다.

## 코드로 실행 시점 확인하기

### 이터레이터는 열거할 때 실행된다

```csharp
static IEnumerable<int> Trace(IEnumerable<int> source)
{
    Console.WriteLine("enumeration started");
    foreach (int value in source)
    {
        Console.WriteLine($"yield {value}");
        yield return value;
    }
}

IEnumerable<int> query = Trace(new[] { 1, 2, 3 }).Take(2);
Console.WriteLine("query created");
foreach (int value in query) Console.WriteLine($"received {value}");
```

쿼리를 만드는 시점에는 `Trace` 본문이 실행되지 않는다. 열거가 시작된 뒤에도 `Take(2)`가 충분한 값을 받으면 세 번째 요소는 요구하지 않는다.

### 반복 열거로 인한 중복 작업

```csharp
IEnumerable<Player> query = repository.StreamPlayers()
    .Where(player => player.IsOnline);

bool any = query.Any();       // 첫 번째 열거와 I/O
int count = query.Count();    // 두 번째 전체 열거와 I/O

List<Player> snapshot = query.ToList(); // 의도적인 한 번의 구체화
bool cachedAny = snapshot.Count > 0;
int cachedCount = snapshot.Count;
```

소스가 DB, 파일, 네트워크라면 반복 열거의 비용과 결과가 달라질 수 있다. 한 시점의 동일 결과를 여러 번 사용할 목적이라면 경계에서 구체화한다.

### 쿼리 구문이 메서드로 변환되는 방식

```csharp
var querySyntax =
    from player in players
    where player.IsOnline
    orderby player.Score descending, player.Name
    select player.Name;

var methodSyntax = players
    .Where(player => player.IsOnline)
    .OrderByDescending(player => player.Score)
    .ThenBy(player => player.Name)
    .Select(player => player.Name);
```

두 표현은 같은 연산 구조를 나타낸다. 두 번째 정렬에 `OrderBy`를 다시 쓰면 앞선 점수 정렬이 새 기본 정렬로 대체되므로 `ThenBy`를 사용한다.

### 지연 이터레이터의 인수 검증

```csharp
static IEnumerable<T> TakeValid<T>(IEnumerable<T> source, int count)
{
    ArgumentNullException.ThrowIfNull(source);
    if (count < 0) throw new ArgumentOutOfRangeException(nameof(count));

    return Iterator();

    IEnumerable<T> Iterator()
    {
        using IEnumerator<T> iterator = source.GetEnumerator();
        for (int i = 0; i < count && iterator.MoveNext(); i++)
            yield return iterator.Current;
    }
}
```

검증을 `yield return`이 있는 본문에 그대로 두면 메서드 호출이 아니라 첫 열거 시점에 예외가 발생한다. 바깥 메서드에서 즉시 검증하고 내부 이터레이터를 반환하면 API 오류 위치가 명확해진다.

### 클로저가 변수와 자원을 붙잡는 방식

```csharp
var predicates = new List<Func<int, bool>>();
for (int threshold = 0; threshold < 3; threshold++)
{
    int captured = threshold;
    predicates.Add(value => value > captured);
}

static Func<Player, bool> ForMinimumLevel(int level) =>
    player => player.Level >= level;
```

캡처된 것은 변수를 보관하는 클로저이며 델리게이트가 살아 있는 동안 함께 유지된다. 루프에서 의도한 현재 값을 별도 지역 변수로 고정하고, DB 컨텍스트나 스트림 같은 자원을 이벤트 람다에 캡처하지 않는다.

캡처가 필요 없는 람다는 `static`으로 실수를 막을 수 있다.

```csharp
var normalized = names.Select(static name => name.Trim().ToUpperInvariant());
```

### `IQueryable<T>`에서 로컬 실행으로 넘어가는 경계

```csharp
IQueryable<PlayerRow> databaseQuery = db.Players
    .Where(player => player.IsActive)
    .OrderByDescending(player => player.Score)
    .Select(player => new PlayerRow(player.Id, player.Name, player.Score));

List<PlayerRow> rows = await databaseQuery.Take(100).ToListAsync();

IEnumerable<PlayerView> local = rows.Select(row =>
    new PlayerView(row.Id, FormatDisplayName(row.Name), row.Score));
```

DB가 처리할 수 있는 필터·정렬·투영과 개수 제한을 먼저 적용한 뒤 구체화한다. 임의의 .NET 메서드 `FormatDisplayName`은 메모리로 가져온 작은 결과에 적용해 번역 오류와 전체 테이블 로드를 피한다.

### 결과 개수의 계약

```csharp
Player unique = players.Single(player => player.Email == email);
Player? optional = players.SingleOrDefault(player => player.ExternalId == id);
Player newest = players.OrderByDescending(player => player.CreatedAt).First();
```

이메일이 유일해야 한다면 `Single`과 DB 유일 제약으로 불변식을 드러낸다. 여러 기록 중 최신 하나를 고르는 목적에는 정렬과 `First`가 맞다. 빈 결과가 정상이라면 `OrDefault`를 사용하되 `null`의 의미를 호출자가 처리하게 한다.

## 복습할 내용

- 각 LINQ 연산이 지연인지 즉시인지 분류하고 실제 열거 횟수를 측정한다.
- 같은 쿼리를 `IEnumerable<T>`와 `IQueryable<T>`에 적용해 실행 위치와 생성 SQL을 비교한다.
- 반복 열거가 잘못된 결과나 중복 I/O를 만드는 예를 작성하고 구체화 위치를 정한다.
- 클로저가 큰 객체와 이벤트 구독의 수명을 연장하는 상황을 메모리 프로파일러로 확인한다.
