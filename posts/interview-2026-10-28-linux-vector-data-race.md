---
title: "공유 vector의 data race와 짧은 잠금으로 배치 넘기기"
description: "vector 재할당과 반복자 무효화, 배치 교환과 동시성 검증을 정리한다."
date: "2026-10-28"
category: "면접 대비"
subcategory: "Linux"
tags: ["면접 기록", "Linux"]
draft: false
aiGenerated: true
---

## 오늘의 질문

이벤트 수집 스레드는 vector에 추가하고 전송 스레드는 순회한다. 간헐적 크래시의 원인과 수집을 오래 막지 않는 개선안을 설명하라.

## 사용자 답변 요지

공유 자원의 data race를 진단하고 lock-free vector 사용을 제안했다.

## 핵심 해설

동기화 없이 push_back과 순회를 수행하면 컨테이너 내부 상태에 data race가 발생할 수 있다. 재할당 시 기존 반복자와 참조도 무효화된다. reserve로 재할당을 줄여도 동기화 문제가 해결되지는 않는다.

표준 vector에는 lock-free 모드가 없다. 전용 동시성 컨테이너도 허용하는 연산과 메모리 회수 규칙을 확인해야 하며 가장 먼저 선택할 해결책은 아니다.

수집과 전송의 소유권을 분리하는 배치 교환을 고려한다.

~~~cpp
// pending에 push하는 수집 스레드도 같은 mutex 사용
std::vector<Event> batch;
{
    std::lock_guard<std::mutex> lock(mutex);
    batch.swap(pending);
}
// batch는 전송 스레드만 사용
send_batch(batch);
~~~

잠금 안에서는 배치 교환만 하고 느린 전송은 밖에서 수행한다. 생산자 push의 할당 비용은 남으므로 필요하면 버퍼 재사용과 용량 계획을 적용한다. 전송 실패 시 재시도·보관 정책과 큐 크기 제한도 필요하다. MPSC 큐 등은 생산자·소비자 수와 순서 보장을 검토하여 선택한다.

ThreadSanitizer로 재현 환경의 data race를 확인하고 AddressSanitizer로 메모리 오류를 보조 확인한다. 도구가 오류를 보고하지 않는 것이 안전성 증명은 아니다. 수집 지연, 잠금 대기, 전송량과 이벤트 유실을 부하 테스트로 비교한다.

## 면접용 모범 답변

공유 vector의 수정과 순회 사이에 data race가 생기며 재할당은 반복자도 무효화할 수 있습니다. 같은 mutex로 보호하되 잠금 안에서 배치를 교환하고 전송은 잠금 밖에서 수행하겠습니다. 먼저 이 구조를 측정하고 필요할 때 검증된 동시성 큐를 검토하겠습니다.

## 참고 자료

- [C++ Core Guidelines: 동시성 지침](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#S-concurrency)
