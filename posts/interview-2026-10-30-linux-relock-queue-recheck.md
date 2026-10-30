---
title: "잠금을 다시 잡았다면 큐 조건도 다시 확인해야 한다"
description: "mutex 재획득과 공유 상태 재검증, 잠금 안에서 작업 꺼내기를 정리한다."
date: "2026-10-30"
category: "면접 대비"
subcategory: "Linux"
tags: ["면접 기록", "C++", "동기화"]
draft: false
aiGenerated: true
---

## 오늘의 질문

스레드가 mutex를 잡고 tasks.size()를 확인한 뒤, 잠금을 풀어 로그를 출력하고 다시 잠급니다. 처음 확인했을 때 작업이 있었다면 곧바로 tasks.front()를 사용해도 될까요? 다른 소비자도 같은 큐를 사용합니다. 안전한 처리 순서를 설명해 주세요.

## 핵심 해설

mutex를 다시 잡아도 이전에 확인한 상태가 보존되지는 않는다. 잠금을 놓은 동안 다른 소비자가 마지막 작업을 가져갔다면 큐는 비어 있다. 재잠금은 지금부터의 상호 배제를 보장할 뿐 과거 상태를 복구하지 않는다.

~~~text
A: 잠금 → 작업 1개 확인 → 잠금 해제
B: 잠금 → 마지막 작업 꺼냄 → 잠금 해제
A: 재잠금 → 큐는 비어 있음
~~~

같은 mutex로 모든 큐 접근을 보호하고 빈 큐 여부 확인과 front/pop을 하나의 임계 구역에서 수행한다.

~~~cpp
Task task;
{
    std::lock_guard<std::mutex> lock(mutex);
    if (tasks.empty()) {
        return;
    }
    task = std::move(tasks.front());
    tasks.pop();
}
task();
~~~

이 코드는 호출 가능한 Task의 이동과 기본 생성을 지원한다고 가정하는 흐름 예시다. 로그가 필요하면 작업을 꺼낼 때 필요한 정보를 함께 복사하고 잠금을 푼 뒤 출력한다. 참조나 반복자만 보관한 채 잠금을 풀지 않는다.

## 면접용 모범 답변

잠금을 풀었다면 다른 소비자가 큐를 바꿀 수 있으므로 다시 잠근 뒤 empty를 재확인하겠습니다. 상태 검사와 작업 이동, pop을 같은 임계 구역에서 수행하고 실제 실행과 로그는 가능한 한 잠금 밖에서 처리하겠습니다.

## 참고 자료

- [C++ Core Guidelines: 동기화 지침](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#S-concurrency)
