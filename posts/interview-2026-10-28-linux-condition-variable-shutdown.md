---
title: "조건 변수로 작업 큐를 기다리고 안전하게 종료하기"
description: "작업 큐의 mutex, 조건 검사, 종료 알림과 join 순서를 정리한다."
date: "2026-10-28"
category: "면접 대비"
subcategory: "Linux"
tags: ["면접 기록", "Linux", "C++", "동기화"]
draft: false
aiGenerated: true
---

## 오늘의 질문

여러 작업 스레드가 하나의 큐에서 작업을 꺼냅니다. 큐가 비었을 때 조건 변수로 기다리도록 구현하려고 합니다. 대기 조건 확인과 작업 추가를 어떤 동기화 규칙으로 묶겠습니까? 서버 종료 시 대기 중인 스레드는 어떻게 종료하겠습니까?

## 핵심 해설

세마포어를 사용하는 대안도 가능하지만 질문은 조건 변수의 동작을 묻는다. 세마포어로 항목 개수를 관리하더라도 일반 큐의 동시 push/pop에는 별도 상호 배제가 필요하다.

조건 변수 방식에서는 큐와 종료 플래그를 같은 mutex로 보호한다. 소비자는 unique_lock을 얻고 다음 조건으로 기다린다.

~~~cpp
cv.wait(lock, [&] { return stopping || !queue.empty(); });
~~~

wait는 mutex를 풀며 대기하고 깨어날 때 다시 획득한다. 조건식으로 가짜 깨움이나 다른 소비자가 먼저 작업을 가져간 경우를 처리한다. 생산자는 mutex 안에서 작업을 넣고 잠금을 푼 뒤 notify_one을 호출할 수 있다. 알림 자체를 작업 상태로 취급하지 않는다.

남은 작업을 처리하고 종료하는 정책이라면 stopping과 queue.empty()가 모두 참일 때 소비자가 빠져나온다. 작업은 잠금 안에서 꺼내고 실제 실행은 잠금 밖에서 수행한다.

종료 시 같은 mutex 아래에서 새 작업 접수를 차단하고 stopping을 설정한다. 잠금을 풀고 notify_all로 대기자를 깨운 뒤 mutex를 잡지 않은 상태에서 모든 스레드를 join한다. 알림과 종료 조건 없이 join만 하면 무한 대기할 수 있다. 실행 중 작업의 I/O나 무한 대기는 별도의 타임아웃과 취소 정책이 필요하다.

## notify_one과 notify_all

두 함수는 조건 변수에서 대기 중인 스레드를 깨운다. 깨우는 것과 작업 실행은 다르다. 깨어난 스레드는 mutex를 다시 획득하고 조건을 확인한다.

| 함수 | 동작 | 작업 큐의 사용 예 |
| --- | --- | --- |
| notify_one() | 대기 중인 스레드 하나를 깨움 | 작업 하나 추가 |
| notify_all() | 대기 중인 모든 스레드를 깨움 | 전체 작업 스레드 종료 요청 |

여러 스레드를 깨워도 같은 mutex는 하나씩 획득한다. notify_one은 어떤 스레드를 깨울지나 공정성을 보장하지 않는다. 알림을 받을 대기자가 없으면 알림 자체는 저장되지 않는다. 처리할 작업과 종료 요청은 큐와 플래그라는 상태로 보관한다.

## 종료 요청 또는 작업 존재를 기다리는 코드

다음은 남은 작업을 모두 처리한 뒤 종료하는 예시다. Task는 호출 가능한 작업이고, 작업이 정상적으로 반환한다고 가정한다. 아래 코드는 같은 범위에 정의한다.

~~~cpp
#include <condition_variable>
#include <functional>
#include <mutex>
#include <queue>
#include <thread>
#include <utility>
#include <vector>

using Task = std::function<void()>;

std::mutex mutex;
std::condition_variable cv;
std::queue<Task> tasks;
bool stopping = false; // tasks와 함께 같은 mutex로 보호
std::vector<std::thread> workers;

void worker()
{
    while (true) {
        std::unique_lock<std::mutex> lock(mutex);

        cv.wait(lock, [] {
            return stopping || !tasks.empty();
            //     종료 요청     작업 존재
        });

        if (stopping && tasks.empty()) {
            return;
        }

        Task task = std::move(tasks.front());
        tasks.pop();

        lock.unlock();
        task(); // 큐 잠금을 놓은 상태에서 작업 실행
    }
}
~~~

wait의 조건식은 참이면 대기를 끝내도 된다는 뜻이다. 종료 요청과 작업 존재 중 하나라도 참이면 진행한다.

| 종료 요청 | 큐에 작업 | 소비자 동작 |
| --- | --- | --- |
| 없음 | 없음 | 대기 |
| 없음 | 있음 | 작업 실행 |
| 있음 | 있음 | 남은 작업 실행 |
| 있음 | 없음 | 종료 |

조건식이 있는 wait는 개념적으로 다음 반복문과 같다.

~~~cpp
while (!stopping && tasks.empty()) {
    cv.wait(lock);
}
~~~

wait는 mutex를 해제하면서 대기에 들어가고, 깨어나면 다시 획득한다. 가짜 깨움이나 다른 소비자가 먼저 작업을 가져간 상황에서도 조건을 다시 검사하므로 빈 큐에 접근하지 않는다.

## 생산자는 작업 추가 후 notify_one

~~~cpp
bool submit(Task task)
{
    {
        std::lock_guard<std::mutex> lock(mutex);

        if (stopping) {
            return false;
        }

        tasks.push(std::move(task));
    }

    cv.notify_one();
    return true;
}
~~~

작업을 추가한 상태 변경은 잠금 안에서 수행한다. 알림은 잠금을 푼 뒤 보낼 수 있다. 알림 시점에 소비자가 아직 기다리지 않았더라도, 나중에 mutex를 잡고 큐가 비어 있지 않음을 확인하므로 대기하지 않는다.

## 종료할 때는 notify_all 후 join

~~~cpp
void shutdown()
{
    {
        std::lock_guard<std::mutex> lock(mutex);
        stopping = true;
    }

    cv.notify_all();

    for (auto& thread : workers) {
        thread.join();
    }
}
~~~

종료 시에는 모든 대기자가 종료 조건을 확인해야 한다. notify_one만 호출하면 다른 소비자가 계속 잠들어 join이 끝나지 않을 수 있다. join 중에는 큐 mutex를 잡지 않아야 한다.

이 예시는 외부 관리 스레드가 shutdown을 한 번 호출하고, workers에는 join 가능한 작업 스레드만 들어 있다고 가정한다. shutdown을 작업 스레드 자신에서 호출하면 자기 자신에 대한 join 문제가 생긴다. 큐와 조건 변수의 수명은 모든 작업 스레드가 종료할 때까지 유지한다.

notify_all은 실행 중인 작업을 강제로 중단하지 않는다. 운영 코드에서는 작업 예외 처리, 큐 크기 제한, I/O 타임아웃과 취소 정책도 추가해야 한다.

## 면접용 모범 답변

큐와 종료 플래그를 같은 mutex로 보호하겠습니다. 소비자는 stopping 또는 큐가 비어 있지 않다는 조건으로 wait하고 작업을 꺼낸 뒤 잠금을 풀고 실행합니다. 생산자는 잠금 안에서 작업을 추가하고 notify_one으로 알립니다. 종료 시 새 작업을 받지 않고 종료 플래그를 설정한 뒤 notify_all로 깨우겠습니다. 남은 작업 처리 정책에 따라 소비자를 종료시키고 잠금을 보유하지 않은 상태에서 join하겠습니다.

## 참고 자료

- [Microsoft: condition_variable의 mutex, 조건 검사와 알림](https://learn.microsoft.com/en-us/cpp/standard-library/condition-variable?view=msvc-170)
- [C++ Core Guidelines: CP.42](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#Rconc-wait)
