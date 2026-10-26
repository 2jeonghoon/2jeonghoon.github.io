---
title: "UObject 포인터는 IsValid만 검사하면 안전할까?"
description: "GC가 추적하는 강한 참조와 약한 참조, IsValid의 한계와 UObject 수명 관리 방법을 정리한다."
date: "2026-10-26"
category: "면접 대비"
subcategory: ""
tags: ["면접 기록", "Unreal Engine", "UObject", "Garbage Collection"]
image: ""
readingTime: ""
featured: false
draft: false
aiGenerated: true
---
매일 면접 질문 하나와 정답, 핵심 해설을 정리한다. 이번에는 일반 C++ 포인터와 Unreal GC가 추적하는 참조의 차이를 다룬다.

## 오늘의 질문

다음은 UObject를 상속한 인벤토리 클래스의 일부다. 인벤토리 자체는 GC에서 도달 가능한 상태로 유지되며, 생성한 아이템을 참조하는 다른 곳은 없다고 가정한다.

```cpp
UObject* CachedItem = nullptr;

void CreateItem()
{
    CachedItem = NewObject<UObject>();
}

void UseItem()
{
    if (CachedItem != nullptr)
    {
        // CachedItem 사용
    }
}
```

1. GC 관점에서 어떤 문제가 가능한가? nullptr 검사만으로 충분한가?
2. 아이템을 계속 살려두려면 멤버를 어떻게 선언해야 하는가?
3. 아이템 수명을 유지하지 않고 살아 있을 때만 참조하려면 무엇을 사용하는가?

## 핵심 해설

### 1. 일반 포인터는 GC가 추적하지 않는다

UPROPERTY로 선언하지 않은 일반 포인터 멤버는 이 예제에서 아이템의 수명을 유지하지 않는다. 다른 강한 참조가 없다면 아이템은 GC 수거 대상이 될 수 있다.

수거 후에도 일반 포인터가 자동으로 nullptr가 되는 것은 아니다. 해제된 객체의 주소를 보관하는 댕글링 포인터가 될 수 있으므로 단순한 nullptr 검사는 충분하지 않다.

IsValid는 객체의 파괴 관련 상태도 확인하지만, 이미 해제된 임의의 주소를 안전하게 검증하는 수단은 아니다. 검사를 추가하는 것만으로 해결하지 말고 참조 방식부터 바로잡아야 한다.

### 2. 수명 유지에는 GC가 추적하는 강한 참조를 사용한다

```cpp
UPROPERTY()
TObjectPtr<UObject> CachedItem = nullptr;
```

GC에서 도달 가능한 인벤토리에 이처럼 선언하면 아이템으로 이어지는 강한 참조가 된다. TObjectPtr 타입만 사용하는 것이 아니라 UPROPERTY로 추적되도록 선언하는 점이 중요하다.

이 강한 참조가 아이템의 일반적인 GC 수거를 막는다는 의미이지, 모든 객체의 명시적 파괴를 금지하는 것은 아니다. 예를 들어 Actor의 Destroy와 일반 UObject의 도달 가능성에 따른 GC 수거는 구분해야 한다.

### 3. 수명을 유지하지 않는 참조에는 TWeakObjectPtr를 사용한다

```cpp
TWeakObjectPtr<UObject> CachedItem;

void UseItem()
{
    if (UObject* Item = CachedItem.Get())
    {
        // Item 사용
    }
}
```

약한 참조는 대상의 GC 수거를 막지 않는다. 대상이 유효하지 않으면 Get으로 사용할 객체를 얻지 못한다. 문제처럼 다른 강한 참조가 전혀 없다면, 약한 참조만 저장한 아이템은 수거될 수 있으며 이는 의도한 동작이다.

이 예제는 게임 스레드의 일반적인 사용을 전제로 한다. 얻은 원시 포인터를 장기간 저장하거나 비동기 작업에 넘기는 경우에는 별도의 수명 보장을 검토해야 한다.

일반 C++ 객체용 TSharedPtr·TWeakPtr 또는 표준 스마트 포인터와 UObject용 참조 타입을 혼동하지 않아야 한다. UObject 수명 관리는 Unreal GC와 호환되는 참조 방식으로 설계한다.

## 면접용 모범 답변

“일반 포인터는 GC가 추적하지 않으므로 대상이 수거돼도 주소가 남을 수 있습니다. IsValid 검사만으로 댕글링 포인터 문제를 해결할 수는 없습니다. 인벤토리가 아이템을 유지해야 한다면 UPROPERTY가 붙은 TObjectPtr를 사용하고, 수명을 유지하지 않는 관찰용 참조라면 TWeakObjectPtr를 사용해 Get 결과를 확인하겠습니다.”

## 참고 자료

- [Epic: Unreal 객체 관리](https://dev.epicgames.com/documentation/unreal-engine/unreal-object-handling-in-unreal-engine)
- [Epic: 객체 포인터](https://dev.epicgames.com/documentation/en-us/unreal-engine/object-pointers-in-unreal-engine)
