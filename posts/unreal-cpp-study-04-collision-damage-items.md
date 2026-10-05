---
title: "언리얼 C++ 공부 04: 충돌, 대미지와 아이템"
description: "Collision Channel과 Response, Trace 기반 공격 판정, 대미지 전달, 소켓과 아이템 액터를 이용한 장비 구조를 정리합니다."
date: "2026-10-05"
category: "Unreal Engine"
subcategory: "Unreal C++ Book"
tags: ["Unreal Engine", "C++", "Collision", "Damage", "Items"]
featured: false
draft: true
aiGenerated: true
---

전투에서 보이는 검과 실제 판정은 같은 것이 아니다. 언리얼은 충돌 형태, 객체 유형, 서로 만났을 때의 반응을 분리해 설정한다. 공격 판정을 안정적으로 만들려면 “무엇과 부딪혔는가”보다 **어떤 채널로 어떤 질문을 했고 상대가 어떻게 응답했는가**를 이해해야 한다.

## Collision의 세 요소

충돌 설정은 크게 다음 세 축으로 나뉜다.

1. 형태: 스태틱 메시의 단순 충돌, Box/Sphere/Capsule 컴포넌트, Skeletal Mesh의 Physics Asset
2. Object Type 또는 Trace Channel: Pawn, WorldStatic, Weapon처럼 대상을 분류
3. Response: 다른 채널을 `Block`, `Overlap`, `Ignore` 중 어떻게 처리할지 결정

`Block`은 이동을 막고 Hit 결과를 만들며, `Overlap`은 통과를 허용하면서 겹침 이벤트를 만든다. Query와 Physics 사용 여부도 별도로 지정되므로 모양이 보인다고 반드시 Trace에 잡히는 것은 아니다.

프로젝트 전용 채널은 이름으로 의도를 드러낼 수 있다. 예를 들어 `Attack` Trace Channel이 `Pawn`만 Block하고 나머지는 Ignore하도록 만들면 공격 코드의 필터 조건이 단순해진다. 채널 설정은 프로젝트 계약이므로 이름과 용도를 문서화한다.

## 공격 판정은 구간을 검사한다

빠르게 움직이는 무기는 한 프레임의 Overlap만으로 대상을 놓칠 수 있다. 책의 근접 공격처럼 캐릭터 앞쪽에 Sweep을 수행하면 시작점과 끝점 사이의 공간을 검사할 수 있다.

```cpp
FHitResult Hit;
FCollisionQueryParams Params(SCENE_QUERY_STAT(Attack), false, this);

const FVector Start = GetActorLocation();
const FVector End = Start + GetActorForwardVector() * AttackRange;
const FCollisionShape Shape = FCollisionShape::MakeSphere(AttackRadius);

const bool bHit = GetWorld()->SweepSingleByChannel(
    Hit,
    Start,
    End,
    FQuat::Identity,
    AttackTraceChannel,
    Shape,
    Params);
```

`SweepSingle`은 첫 결과만 필요할 때, `SweepMulti`는 범위 안의 여러 대상을 처리할 때 사용한다. 멀티 결과에서는 같은 액터의 여러 컴포넌트를 맞힐 수 있으므로 액터별 중복 피해를 방지해야 한다.

디버그 도형은 판정 위치와 크기를 확인하는 데 유용하지만 Shipping 빌드의 게임 로직이 디버그 코드에 의존하면 안 된다.

## 대미지는 요청과 결과를 분리한다

언리얼의 `ApplyDamage`, `ApplyPointDamage`, `ApplyRadialDamage`는 공격자, 원인, 피해 유형과 대상 사이의 공통 전달 경로를 제공한다. 대상은 `TakeDamage` 또는 관련 이벤트에서 실제 체력을 변경한다.

```cpp
UGameplayStatics::ApplyDamage(
    Hit.GetActor(),
    BaseDamage,
    GetController(),
    this,
    UDamageType::StaticClass());
```

공격자가 상대의 `CurrentHP`를 직접 수정하면 방어력, 무적, 팀 판정, 사망 처리 같은 규칙이 여러 공격 코드로 흩어진다. 대상이나 전투 컴포넌트가 피해 계산을 한곳에서 처리해야 한다.

```text
공격 판정 성공
  ↓ Damage Event
대상 방어 규칙 적용
  ↓ 실제 피해 확정
HP 변경
  ├─ UI 갱신
  ├─ 피격 연출
  └─ 0 이하이면 사망 전이
```

멀티플레이에서는 서버가 판정과 체력 변경을 수행하고 결과를 복제하는 것이 기본이다. 클라이언트가 보낸 피해량이나 피격 대상을 그대로 신뢰하지 않는다.

## 소켓에 장비 부착하기

Skeletal Mesh의 Socket은 뼈에 이름 있는 부착 지점을 제공한다. 손 뼈에 `WeaponSocket`을 만들고 무기 액터를 부착하면 애니메이션을 따라 움직인다.

```cpp
Weapon->AttachToComponent(
    GetMesh(),
    FAttachmentTransformRules::SnapToTargetNotIncludingScale,
    TEXT("WeaponSocket"));
```

무기를 캐릭터 컴포넌트로 고정하면 단순하지만 교체와 독립적인 상태 관리가 어렵다. 무기를 별도 Actor로 만들면 장착, 드롭, 내구도와 공격 범위를 캡슐화할 수 있다. 반면 Actor 수와 복제 비용은 늘어나므로 기능이 단순한 장식까지 모두 Actor로 만들 필요는 없다.

## 아이템 상자의 상호작용

아이템 상자는 충돌 컴포넌트로 플레이어를 감지하고 아이템을 전달한 뒤 비활성화할 수 있다. Overlap 이벤트는 여러 번 호출될 수 있으므로 획득 여부를 원자적인 상태 전이처럼 다룬다.

```cpp
void AItemBox::OnOverlap(AActor* OtherActor)
{
    if (bConsumed)
        return;

    AStudyCharacter* Character = Cast<AStudyCharacter>(OtherActor);
    if (Character == nullptr || !Character->CanReceive(ItemData))
        return;

    bConsumed = Character->TryReceive(ItemData);
    if (bConsumed)
        SetActorEnableCollision(false);
}
```

“아이템 지급”과 “상자 제거” 사이에 실패할 수 있다면 순서를 명확히 해야 한다. 인벤토리 용량 부족 시 상자를 없애지 않을지, 일부만 받을 수 있는지 같은 정책이 필요하다.

## 데이터와 표현 분리

아이템의 이름, 아이콘, 메시, 능력치는 Data Asset이나 Data Table에 둘 수 있다. 월드의 아이템 액터는 어떤 데이터 항목을 나타내는지 참조하고, 실제 인벤토리는 가벼운 식별자와 수량을 저장하는 구조가 확장에 유리하다.

하드 참조로 많은 메시와 아이콘을 한 번에 연결하면 해당 객체를 로드할 때 의존 에셋도 함께 메모리에 들어올 수 있다. 종류가 많은 아이템은 Soft Reference와 비동기 로딩을 검토한다.

## 흔한 오류

- 공격이 자신을 맞힌다: Query Params에 공격자를 무시 대상으로 넣는다.
- 한 번 휘둘렀는데 여러 번 피해가 들어간다: 공격별 Hit Actor 집합을 유지한다.
- Overlap이 발생하지 않는다: 양쪽 컴포넌트의 Generate Overlap Events와 채널 Response를 확인한다.
- 무기가 뒤틀린다: 소켓 Transform과 부착 규칙, 메시 축과 스케일을 확인한다.
- 멀티플레이에서 아이템이 중복된다: 획득 판정과 스폰·제거를 서버가 소유하도록 한다.

## 복습 질문

- Object Channel과 Trace Channel은 어떤 질문을 표현하는가?
- 공격자가 체력을 직접 수정하지 않고 Damage 경로를 사용하는 이유는 무엇인가?
- 무기를 컴포넌트와 Actor 중 어느 형태로 만들지 무엇으로 판단하는가?
- 아이템 에셋의 하드 참조가 로딩과 메모리에 미치는 영향은 무엇인가?

## 참고 자료

- 이득우, 『이득우의 언리얼 C++ 게임 개발의 정석』
- [코딩 부부: 충돌 설정과 대미지 전달](https://wecandev.tistory.com/136)
- [코딩 부부: 아이템 상자와 무기 제작](https://wecandev.tistory.com/137)
