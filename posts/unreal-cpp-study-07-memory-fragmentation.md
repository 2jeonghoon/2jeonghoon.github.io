---
title: "언리얼 C++ 공부 07: 메모리 관리와 단편화 대응"
description: "언리얼에서 메모리 단편화를 누수·에셋 상주·GC 문제와 구분하고 Memory Insights, LLM, 컨테이너 용량 관리와 객체 풀링으로 진단·대응하는 방법을 정리합니다."
date: "2026-10-05"
category: "Unreal Engine"
subcategory: "Unreal C++ Book"
tags: ["Unreal Engine", "C++", "Memory", "Fragmentation", "Unreal Insights", "LLM"]
featured: false
draft: true
aiGenerated: true
---

게임을 오래 실행했을 때 프로세스 메모리가 증가하거나 큰 할당이 실패한다고 해서 모두 메모리 누수는 아니다. 살아 있는 객체가 계속 늘어나는 누수, 필요 없는 에셋이 참조 때문에 남는 문제, 컨테이너의 여유 용량, allocator가 보관한 캐시, 주소 공간과 실제 물리 메모리, CPU 메모리와 GPU 메모리를 구분해야 한다. **단편화라고 단정하기 전에 어떤 메모리가 누구에게 소유되어 있는지 측정하는 것**이 먼저다.

## 외부 단편화와 내부 단편화

외부 단편화는 사용 가능한 총량은 충분하지만 빈 공간이 여러 조각으로 흩어져 큰 연속 블록을 제공하지 못하는 상태다.

```text
사용 중  빈 공간  사용 중  빈 공간  사용 중
[ AAA ][  8MB  ][ BBB ][ 12MB  ][ CCC ]

총 20MB가 비어 있어도 연속 16MB 요청은 실패할 수 있다.
```

내부 단편화는 allocator가 크기 등급에 맞춰 실제 요청보다 큰 블록을 제공해 블록 내부에 남는 공간이다. 예를 들어 33바이트 요청이 48바이트 bin을 사용하면 차이가 내부 낭비가 된다. 정렬과 메타데이터, 컨테이너의 slack도 사용량과 예약량의 차이를 만든다.

언리얼의 `FMallocBinned2` 같은 binned allocator는 작은 할당을 크기별 pool로 처리해 일반적인 단편화를 줄인다. 그렇다고 단편화가 사라지는 것은 아니다. 서로 다른 크기와 수명의 대규모 할당, thread cache, 플랫폼 메모리 정책, GPU 리소스는 별도 양상을 보인다. 프로젝트가 사용하는 allocator와 플랫폼을 확인하지 않고 특정 allocator 교체를 만능 해결책으로 권해서는 안 된다.

## 먼저 증상을 분류한다

| 관찰 | 가능한 원인 |
| --- | --- |
| Live allocation 수와 크기가 계속 증가 | 누수, 참조가 끊기지 않은 객체, 무제한 캐시 |
| 게임 상태는 돌아왔지만 프로세스 상주 메모리가 유지 | allocator/OS 캐시, 컨테이너 capacity, 아직 상주한 에셋 |
| GC 직후 크게 감소 | 수집 대기 중이던 UObject가 많음 |
| 큰 텍스처나 버퍼 생성에서 실패 | GPU 예산, 연속 블록, 스트리밍 설정 또는 플랫폼 제한 |
| Spawn/Destroy 구간에서 프레임 히치 | 생성·등록·GC 비용, 짧은 수명의 할당 폭주 |
| 장시간 실행 뒤 특정 크기 할당만 실패 | 단편화 가능성, allocator bin과 큰 할당 패턴 조사 필요 |

운영체제가 보고하는 프로세스 메모리만으로 원인을 확정하지 않는다. allocator가 재사용을 위해 페이지를 보유하면 논리적으로 해제된 뒤에도 RSS가 즉시 줄지 않을 수 있다.

## Memory Insights로 할당 수명을 본다

UE5 Memory Insights는 할당·해제 이벤트, 크기, LLM 태그와 callstack을 시간축에서 분석한다. 메모리 채널은 프로세스 시작부터 켜야 전체 할당을 추적할 수 있다.

```text
MyGame.exe -trace=default,memory,metadata,assetmetadata
```

Development 빌드로 동일한 플레이 시나리오를 반복하고 기준 시점 A와 종료 시점 B를 표시한다.

1. A 이후 할당되어 B에도 살아 있는 블록을 찾는다.
2. Allocation Count와 Size를 각각 정렬한다.
3. LLM Tag, Asset, Class, Alloc Callstack으로 그룹화한다.
4. 같은 게임 상태로 돌아왔는데 반복마다 남는 블록이 증가하는지 본다.
5. 큰 블록 문제와 수많은 작은 블록 문제를 분리한다.

살아 있는 블록이 의도된 캐시인지 누수인지 판단하려면 시나리오와 소유권을 알아야 한다. 한 번 로드한 공용 에셋이 남는 것과 매 라운드 같은 에셋이 새 사본으로 증가하는 것은 다르다.

## LLM으로 범주를 좁힌다

Low-Level Memory Tracker는 엔진과 플랫폼 할당을 태그별로 집계한다.

```text
실행 인자: -LLM
콘솔: stat LLM
      stat LLMFULL
      stat LLMPlatform
```

연속 기록이 필요하면 `-LLMCSV`를 사용하고 `Saved/Profiling/LLM`의 결과를 비교한다. Default Tracker는 주로 `FMemory`를 거친 할당을, Platform Tracker는 allocator 내부와 OS 수준을 포함하는 더 낮은 층을 본다. 두 수치의 차이가 있다고 즉시 누수로 판단하지 말고 추적 범위가 다름을 고려한다.

자체 시스템의 할당을 찾기 어렵다면 LLM scope tag를 추가해 기능별 비용을 묶을 수 있다. 태깅과 상세 추적 자체에도 오버헤드가 있으므로 성능 수치와 메모리 수치는 프로파일링 조건을 기록해 비교한다.

## 컨테이너 재할당을 줄인다

`TArray`가 성장할 때 더 큰 연속 블록을 할당하고 요소를 옮긴다. 최종 크기를 예상할 수 있다면 `Reserve`로 반복 재할당을 줄인다.

```cpp
TArray<FVisibleActor> VisibleActors;
VisibleActors.Reserve(ExpectedCount);

for (const AActor* Actor : Candidates)
{
    if (IsVisible(Actor))
    {
        VisibleActors.Emplace(Actor);
    }
}
```

반복해서 채우는 배열은 `Reset`으로 요소 수만 0으로 만들고 기존 capacity를 재사용할 수 있다.

```cpp
VisibleActors.Reset(); // 메모리를 유지해 다음 프레임에 재사용
```

반대로 큰 일회성 배열이 다시 작아진 뒤 오랫동안 유지된다면 `Shrink`나 적절한 `Empty`를 검토한다. 하지만 매 프레임 `Shrink`한 뒤 다시 키우면 할당과 복사가 반복되어 오히려 단편화와 히치를 늘릴 수 있다.

```text
자주 재사용하고 크기가 비슷함 → Reset, 합리적인 Reserve
크기가 영구히 줄었음          → 측정 후 Shrink 고려
크기 변동이 매우 큼            → 상한, chunk/page 구조 검토
```

대형 데이터가 반드시 연속일 필요가 없다면 페이지 단위로 할당하는 `TPagedArray` 같은 구조가 큰 연속 블록 요구를 줄일 수 있다. API와 캐시 지역성의 대가가 있으므로 자료 접근 패턴을 함께 측정한다.

## 객체 풀링은 선택적으로 사용한다

투사체, 피격 이펙트, 반복 스폰되는 고비용 Actor를 계속 생성·파괴하면 메모리 할당뿐 아니라 World 등록, 컴포넌트 등록, 렌더링과 물리 상태 설정, GC 비용이 발생한다. 풀링은 필요한 객체를 미리 만들고 비활성화한 뒤 재사용한다.

```text
Acquire
  → Transform/Owner/상태 초기화
  → Collision·Tick·표시 활성화

Release
  → 타이머·델리게이트·비동기 작업 취소
  → Collision·Tick·표시 비활성화
  → 풀로 반환
```

풀링은 할당 수명을 안정시켜 단편화 가능성을 줄일 수 있지만 공짜가 아니다.

- 최대 동시 개수만큼 메모리를 계속 점유한다.
- 반환 시 상태를 완전히 초기화하지 않으면 이전 사용자의 데이터가 남는다.
- 단순한 작은 C++ 구조체는 allocator가 직접 재사용하는 편이 더 빠를 수 있다.
- 풀 상한을 무제한으로 늘리면 풀 자체가 누수가 된다.

따라서 Actor 생성·파괴가 실제 핫스팟일 때, 명확한 상한과 반환 규칙을 가진 대상에 적용한다.

## UObject와 Garbage Collection

UObject는 참조 그래프를 기반으로 GC가 관리한다. `UPROPERTY`/`TObjectPtr`, 컨테이너 참조, Root 등록과 델리게이트 때문에 예상보다 오래 살아 있을 수 있다. 반대로 GC가 알아야 하는 참조를 원시 포인터에만 보관하면 객체가 수집된 뒤 잘못된 포인터를 사용할 수 있다.

`Destroy()`를 호출한 Actor는 즉시 메모리에서 사라지는 것이 아니라 파괴 대상으로 표시되고 이후 GC에서 정리된다. GC를 자주 강제하면 메모리가 빨리 줄어 보일 수 있지만 긴 정지 시간을 만들 수 있다. 공식 가이드가 설명하듯 대규모 할당 직전 OOM이나 paging hitch가 재현되는 제한된 구간처럼 측정된 이유가 있을 때만 수동 GC를 검토한다.

GC 설정을 바꾸기 전에 다음을 확인한다.

- 수집 대상이 실제로 참조에서 풀렸는가?
- 한 프레임에 너무 많은 UObject를 만들고 버리는가?
- 비동기 로딩 핸들, 델리게이트나 전역 캐시가 객체를 붙잡고 있는가?
- Actor 대신 가벼운 구조체로 충분한 데이터까지 UObject로 만들었는가?

## 에셋과 GPU 메모리를 분리한다

텍스처, 메시, 애니메이션과 사운드는 코드의 작은 객체보다 훨씬 큰 메모리를 사용할 수 있다. 하드 참조 그래프 때문에 맵 진입 시 의도치 않은 에셋이 로드될 수 있다. Reference Viewer, Size Map, Asset Audit와 Memory Insights의 asset metadata를 사용해 로딩 근거를 찾는다.

GPU 메모리 부족과 CPU heap 단편화는 같은 문제가 아니다. 렌더 타깃, 텍스처 풀, 버추얼 텍스처와 RHI 리소스는 플랫폼 도구와 GPU 관련 통계를 함께 확인한다. CPU 객체 풀링으로 GPU 텍스처 예산 문제를 해결할 수는 없다.

## allocator 조작은 마지막 단계다

`FMallocBinned2`는 크기별 pool, thread cache와 OS page cache를 사용한다. API에는 allocator 통계 출력과 cache trim 기능도 있지만, 프로젝트 코드에서 임의로 자주 trim하거나 allocator를 교체하는 것은 전역 성능 특성을 바꾼다. 다음 순서를 지킨다.

1. 재현 가능한 장시간 시나리오와 메모리 예산을 만든다.
2. Memory Insights와 LLM으로 태그, 크기, callstack과 수명을 찾는다.
3. 참조 누수와 에셋 상주, 무제한 컬렉션을 먼저 고친다.
4. 반복 재할당과 Spawn/Destroy churn을 줄인다.
5. 플랫폼별 allocator 통계와 큰 연속 할당 실패 근거가 있을 때 엔진/플랫폼 담당자와 allocator 정책을 검토한다.

단편화는 “메모리가 높다”는 관찰이 아니라, 할당 패턴과 allocator 상태로 입증해야 하는 진단이다.

## 실전 점검표

- 동일한 맵 이동이나 전투 라운드를 20~100회 반복해 증가가 수렴하는지 본다.
- 테스트 시작과 종료의 게임 상태, 에셋 로딩 상태와 GC 조건을 동일하게 맞춘다.
- 총 바이트뿐 아니라 live allocation 개수와 크기 분포를 비교한다.
- `TArray::Num()`과 `Max()` 차이가 큰 장수명 컨테이너를 찾는다.
- 매 프레임 생성되는 `FString`, 임시 배열과 동적 UObject를 줄인다.
- 풀링 대상에는 최대 크기, 초과 정책, 완전한 Reset 계약을 둔다.
- PC 결과를 모바일·콘솔 allocator와 GPU 예산에 그대로 일반화하지 않는다.

## 복습 질문

- 메모리 누수와 외부 단편화는 Memory Insights에서 어떻게 다르게 보일 수 있는가?
- `Reset`, `Empty`, `Shrink`, `Reserve`를 각각 언제 사용해야 하는가?
- 모든 객체를 풀링하면 오히려 메모리 사용량이 늘 수 있는 이유는 무엇인가?
- GC 직후 RSS가 즉시 크게 줄지 않는다면 어떤 층을 더 확인해야 하는가?
- CPU allocator 단편화와 GPU 메모리 예산 문제를 어떻게 구분할 것인가?

## 참고 자료

- [Epic Games: Memory Insights](https://dev.epicgames.com/documentation/en-us/unreal-engine/memory-insights-in-unreal-engine)
- [Epic Games: Low-Level Memory Tracker](https://dev.epicgames.com/documentation/unreal-engine/using-the-low-level-memory-tracker-in-unreal-engine)
- [Epic Games: Common Memory and CPU Performance Considerations](https://dev.epicgames.com/documentation/en-us/unreal-engine/common-memory-and-cpu-performance-considerations-in-unreal-engine)
- [Epic Games API: FMallocBinned2](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Core/FMallocBinned2)
- [Epic Games API: TArray::Reserve](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Core/TArray/Reserve)
- [Epic Games API: TPagedArray](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Core/TPagedArray)
