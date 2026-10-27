---
title: "강한 참조를 해제하면 약한 참조는 어떻게 될까?"
description: "TObjectPtr와 TWeakObjectPtr의 역할, 강한 참조 해제와 GC 수거의 차이, Get으로 얻은 원시 포인터의 수명을 정리한다."
date: "2026-10-27"
category: "면접 대비"
subcategory: ""
tags: ["면접 기록", "Unreal Engine", "UObject", "Garbage Collection"]
image: ""
readingTime: ""
featured: false
draft: false
aiGenerated: true
---
매일 면접 질문 하나와 정답, 핵심 해설을 정리한다. [지난 글](?post=interview-2026-10-26-uobject-gc-references)에 이어 강한 참조를 해제한 뒤 약한 참조가 어떻게 동작하는지 확인한다.

## 오늘의 질문

GC에서 도달 가능한 UObject 클래스에 다음 멤버가 있다. 다른 참조와 명시적 파괴는 없으며, 모든 코드는 게임 스레드에서 실행한다고 가정한다.

```cpp
UPROPERTY()
TObjectPtr<UObject> OwnedItem = nullptr;

TWeakObjectPtr<UObject> ObservedItem;

void CreateItem()
{
    OwnedItem = NewObject<UObject>();
    ObservedItem = OwnedItem.Get();
}

void ReleaseItem()
{
    OwnedItem = nullptr;
}
```

1. CreateItem 이후 GC가 실행되면 아이템은 수거되는가?
2. ReleaseItem 직후와 GC 수거 완료 후 ObservedItem.Get()은 각각 무엇을 반환하는가?
3. Get으로 얻은 UObject*를 일반 멤버에 저장해 다음 프레임부터 사용하면 어떤 문제가 있는가?

## 핵심 해설

### 1. 도달 가능한 강한 참조가 아이템을 유지한다

OwnedItem은 UPROPERTY가 붙은 TObjectPtr이며, 이를 가진 객체도 GC에서 도달 가능하다. 따라서 이 강한 참조가 아이템을 유지한다. ObservedItem은 약한 참조이므로 아이템의 수명을 연장하지 않는다.

### 2. 참조 해제와 객체 수거는 같은 시점이 아니다

ReleaseItem은 강한 참조를 제거하지만 객체를 즉시 삭제하는 연산은 아니다. 아직 대상이 유효하면 ObservedItem.Get()은 아이템 포인터를 반환할 수 있다. 이후 GC가 대상을 수거하면 Get은 nullptr를 반환한다.

| 상태 | ObservedItem.Get() |
| --- | --- |
| 강한 참조가 유지되고 대상이 유효함 | 아이템 포인터 |
| 강한 참조 해제 후, 아직 대상이 유효함 | 아이템 포인터를 반환할 수 있음 |
| GC가 아이템 수거를 완료함 | nullptr |

TWeakObjectPtr는 수거 후 잘못된 메모리 주소를 그대로 반환하는 일반 댕글링 포인터와 다르다. 대상이 더 이상 유효하지 않음을 확인할 수 있도록 설계된 참조다. 사용 시 Get 결과나 IsValid를 확인한다.

### 3. 약한 참조에서 꺼낸 원시 포인터는 약한 참조 기능을 갖지 않는다

```cpp
UObject* CachedRaw = ObservedItem.Get();
```

위 결과를 GC가 추적하지 않는 일반 멤버에 장기간 저장하면, 이후 수거 시 주소가 남아 댕글링 포인터가 될 수 있다. Get으로 조회했다는 사실이 객체의 수명을 연장하거나 이후 모든 시점의 안전을 보장하지는 않는다.

관찰만 하려면 TWeakObjectPtr를 유지하고 필요한 시점마다 조회한다.

```cpp
void UseItem()
{
    if (UObject* Item = ObservedItem.Get())
    {
        // 게임 스레드에서 Item을 즉시 사용
    }
}
```

수명을 유지해야 한다면 GC에서 도달 가능한 UObject의 멤버에 다음처럼 저장한다.

```cpp
UPROPERTY()
TObjectPtr<UObject> RetainedItem = nullptr;
```

TObjectPtr 타입만 선언하는 것으로는 충분하지 않다. 이 사례에서는 UPROPERTY를 통한 GC 추적이 필요하다. 비동기 작업이나 워커 스레드에서의 접근은 별도의 수명·동기화 설계를 검토해야 한다.

## 면접용 모범 답변

“OwnedItem의 강한 참조 때문에 생성 후 GC에서는 수거되지 않습니다. 이를 해제해도 즉시 삭제되지는 않지만, 이후 수거되면 ObservedItem.Get()은 nullptr를 반환합니다. 관찰용이면 약한 참조를 유지하며 매번 조회하고, 수명을 유지해야 한다면 UPROPERTY가 붙은 TObjectPtr에 저장하겠습니다.”

## 참고 자료

- [Epic: 객체 포인터](https://dev.epicgames.com/documentation/en-us/unreal-engine/object-pointers-in-unreal-engine)
