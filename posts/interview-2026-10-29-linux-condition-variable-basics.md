---
title: "condition_variable과 wait를 처음부터 이해하기"
description: "조건, mutex, unique_lock과 wait의 대기·재잠금 동작, 종료 시 전체 알림을 설명한다."
date: "2026-10-29"
category: "면접 대비"
subcategory: "Linux"
tags: ["면접 기록", "C++", "조건 변수"]
draft: false
aiGenerated: true
---

## 오늘의 질문

작업 스레드 네 개가 다음 조건으로 기다립니다.

~~~cpp
cv.wait(lock, [&] {
    return stopping || !tasks.empty();
});
~~~

관리 스레드가 같은 mutex 아래에서 stopping = true로 바꾼 뒤 notify_one()을 호출하고 네 스레드를 모두 join()합니다. 큐가 비어 있다면 어떤 문제가 생길 수 있습니까? 종료 절차를 어떻게 수정하겠습니까?

## cv는 무엇인가

cv는 std::condition_variable 객체의 관례적인 변수 이름이다. 대기 중인 스레드를 알림으로 깨우는 수단이지 true/false를 저장하는 플래그가 아니다. 실제 조건은 tasks와 stopping 같은 공유 상태에 있다. mutex는 이 상태를 보호하고, 조건 변수는 조건이 바뀔 때까지 CPU를 쓰며 확인하지 않고 대기하게 한다.

~~~cpp
std::mutex m;
std::condition_variable cv;
std::queue<Task> tasks;
bool stopping = false;
~~~

## wait를 한 줄씩 이해하기

~~~cpp
std::unique_lock<std::mutex> lock(m);

cv.wait(lock, [&] {
    return stopping || !tasks.empty();
});
~~~

unique_lock은 생성 시 m을 잠근다. wait가 잠금을 풀었다 다시 잡을 수 있도록 전달한다. 람다 [&]는 주변 변수를 참조해 조건을 계산하는 함수다.

조건이 처음부터 참이면 wait는 잠금을 유지한 채 바로 반환한다. 거짓이면 mutex 해제와 대기 진입을 원자적으로 수행한다. 대기 중 mutex를 놓으므로 생산자가 큐를 바꿀 수 있다. 알림이나 가짜 깨움 후 mutex를 다시 획득하고 조건을 재검사한다. 조건이 거짓이면 다시 기다리고, 참이면 잠금을 가진 상태로 반환한다.

~~~text
mutex 잠금 → 조건 검사
               ├ 참 → 다음 코드
               └ 거짓 → mutex 해제 + 대기
                             ↓ 깨어남
                        mutex 다시 획득
                             ↓
                          조건 재검사
~~~

## 소비자의 종료 판단

~~~cpp
cv.wait(lock, [&] { return stopping || !tasks.empty(); });

if (stopping && tasks.empty()) {
    return; // 종료 요청이 있고 남은 작업도 없음
}

// 잠금을 유지한 상태에서 작업을 꺼낸다.
Task task = std::move(tasks.front());
tasks.pop();
lock.unlock();
task();
~~~

| stopping | 큐에 작업 | 동작 |
| --- | --- | --- |
| false | 없음 | 대기 |
| false | 있음 | 작업 실행 |
| true | 있음 | 남은 작업 실행 |
| true | 없음 | 종료 |

작업을 계속 꺼내는 소비자 반복문 안의 일부 코드다. 작업 실행은 잠금 밖에서 한다.

## 생산자와 종료 요청

생산자는 같은 mutex를 잡고 종료 여부를 확인한 다음 작업을 넣는다. 잠금을 놓고 notify_one으로 소비자 하나를 깨울 수 있다. notify는 상태를 바꾸거나 기억하지 않는다. 큐에 작업이 남아 있으므로 알림 시점에 대기자가 없어도 나중에 조건 검사로 작업을 발견한다.

~~~cpp
{
    std::lock_guard<std::mutex> lock(m);
    stopping = true;
}
cv.notify_all();

for (auto& worker : workers) {
    worker.join();
}
~~~

종료에서는 모든 대기자가 조건을 확인해야 한다. notify_one은 하나만 깨우므로 나머지가 계속 잠들어 join이 끝나지 않을 수 있다. 우연한 가짜 깨움에 의존해서는 안 된다. notify_all은 모든 대기자를 깨우지만 mutex는 하나씩 획득한다.

종료 요청 뒤 새 작업을 받지 않도록 같은 mutex 아래에서 접수를 거절한다. join은 mutex 없이 외부 관리 스레드에서 수행하고 스레드들이 끝날 때까지 큐와 조건 변수의 수명을 유지한다. 실행 중인 작업을 notify_all로 강제 취소할 수는 없다.

## 면접용 모범 답변

조건 변수는 공유 상태가 바뀔 때까지 스레드를 대기시키는 수단입니다. wait는 mutex를 잡고 조건을 확인한 뒤 거짓이면 잠금을 풀고 기다립니다. 깨어나면 다시 잠그고 조건을 재확인합니다. 종료 시에는 같은 mutex 아래에서 종료 상태를 설정하고 notify_all로 모든 대기자를 깨운 뒤 잠금 없이 join하겠습니다.

## 참고 자료

- [Microsoft: condition_variable](https://learn.microsoft.com/en-us/cpp/standard-library/condition-variable?view=msvc-170)
- [어제의 작업 큐와 종료 코드](?post=interview-2026-10-28-linux-condition-variable-shutdown)
