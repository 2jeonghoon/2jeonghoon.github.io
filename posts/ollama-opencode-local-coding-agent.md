---
title: "Ollama와 OpenCode로 로컬 코딩 에이전트를 사용해 본 후기"
description: "Codex와 Claude Code의 사용량 한도에 도달했을 때 로컬 LLM을 대안으로 쓸 수 있을까? Radeon 9070 XT에서 Ollama와 OpenCode를 MapleStory Worlds 개발에 사용한 과정과 결과를 정리했습니다."
date: "2026-10-13"
order: 4
category: "Development"
subcategory: "AI"
tags: ["Ollama","OpenCode","Local LLM","Qwen","MapleStory Worlds"]
image: ""
readingTime: ""
featured: false
draft: false
aiGenerated: false
---
Codex와 Claude Code를 쓰다 사용량 한도에 도달하면, 다시 사용할 수 있을 때까지 기다려야 한다. 그 시간에 로컬 LLM으로 간단한 코딩 작업을 처리할 수 없을까? 이 호기심에서 시작해 Ollama로 모델을 실행하고, OpenCode에 연결해 코딩 에이전트처럼 사용해 봤다.

결론부터 말하면 연결 자체는 성공했다. 다만 MapleStory Worlds 게임 개발 중 시도한 간단한 작업에도 30분 이상 걸려, 당시 환경에서는 실용적인 대안으로 쓰기 어려웠다. 이 글은 그 과정과 시행착오를 기록한 것이다. 아래의 성능 평가는 한 번의 개인적 사용 경험이며, 모델 전체의 성능을 단정하는 비교 실험은 아니다.

## Ollama에서 시작하다

먼저 [Ollama](https://ollama.com/download)를 설치했다. LLM 뿐만아니라 MCP도 연결해 사용하고 싶었기에 오픈소스로 공개되어 있는 [Ollmcp](https://github.com/jonigl/mcp-client-for-ollama)도 설치해 사용해 봤다. 로컬에서 모델을 돌려 보는 단계는 흥미로웠지만, 내가 원하던 것은 대화만 하는 환경이 아니었다. Codex나 Claude Code처럼 프로젝트의 파일을 읽고, 수정하고, 필요한 명령을 실행하는 흐름을 원했다.

그런 형태의 코딩 에이전트 환경을 찾다가 [OpenCode](https://opencode.ai/)를 알게 되어 Ollama와 함께 써보기로 했다. Ollama는 로컬 모델을 실행하고, OpenCode는 그 모델을 이용해 코딩 작업의 흐름을 맡는 구성이었다. 당시 사용한 GPU는 Radeon 9070 XT였다.

## Gemma 4에서 Qwen 3.6으로

처음 Ollama에서 사용한 모델은 Gemma 4였다. 하지만 내 환경에서 OpenCode와 연결해 작업을 시도했을 때 정상적으로 진행되지 않았다. 정확히 어떤 설정이나 동작이 원인이었는지는 확인하지 못했다. 추측컨데 Gemma 4 모델이 지원하는 api와 Opencode가 서로 호환이 안되는 것 같다고 생각했다.

이후 모델을 Qwen 3.6 27B(`qwen3.6:27b`)로 바꿨고, 같은 목적의 작업 흐름은 정상적으로 진행됐다. 적어도 내 환경에서는 OpenCode가 모델을 호출하고 코딩 작업을 이어가는 데 성공했다. 모델을 바꾼 뒤 동작했다는 사실과, 앞선 실패의 원인을 밝혔다는 것은 별개의 이야기다.

## 지금 다시 구성한다면

아래는 당시 내가 입력한 명령을 그대로 복원한 기록이 아니라, [Ollama의 OpenCode 실행 안내](https://ollama.com/blog/launch)와 [Qwen 3.6 모델 페이지](https://ollama.com/library/qwen3.6)를 바탕으로 정리한 재현 절차다. 내가 사용한 모델 태그는 `qwen3.6:27b`였다. 장비 구성에 따라 실행 속도는 달라진다.

1. [Ollama](https://ollama.com/download)와 [OpenCode](https://opencode.ai/docs/)를 설치한다.
2. 터미널에서 사용할 모델을 내려받는다.

   ```sh
   ollama pull qwen3.6:27b
   ```

3. Ollama에서 OpenCode를 실행하고 모델을 선택한다.

   ```sh
   ollama launch opencode --model qwen3.6:27b
   ```

4. 작업할 프로젝트에서 파일 탐색이나 작은 수정 작업을 요청해 연결 상태를 확인한다.

이미 내려받은 모델의 정확한 이름과 태그는 `ollama list`의 `NAME` 열에서 확인할 수 있다. 이 글에서 사용한 `qwen3.6:27b`의 태그는 `27b`다.

내 실제 시도에서는 [MapleStory Worlds MCP](https://maplestoryworlds-creators.nexon.com/ko/docs?postId=1368)를 활용해 개발 중이던 게임 작업을 OpenCode에 맡겼다. 따라서 단순 채팅만 시험한 것이 아니라, 게임 개발 도구와 연결된 에이전트 흐름을 사용했다.

Ollama의 `launch` 명령을 사용하지 않는 경우에는 [OpenCode의 Ollama 제공자 설정 문서](https://opencode.ai/docs/providers/)를 참고해 로컬 Ollama 주소(`http://localhost:11434/v1`)와 설치한 모델 ID를 설정할 수 있다. 이 연결에 앞서 사용했던 Ollama MCP가 필수인 것은 아니다.

## 동작은 했지만, 기다리는 시간이 길었다

Qwen 3.6으로 바꾸자 OpenCode의 에이전트 흐름은 진행됐다. 그러나 MapleStory Worlds MCP를 활용한 게임 개발의 간단한 작업 하나에도 약 30분 이상이 걸렸다. 사용량 한도 때문에 생긴 빈 시간을 메우려는 원래 목적을 생각하면, 이 정도 대기 시간은 부담스러웠다.

시간이 오래 걸린 정확한 병목은 측정하지 않았다. Radeon 9070 XT를 사용했지만 모델 추론 속도, 시스템 메모리와 GPU 사용 상태, 컨텍스트 길이, OpenCode와 MCP의 도구 호출 횟수 중 어느 요소가 결정적이었는지는 알 수 없다. 결과적으로 내가 확인한 것은 “작업 흐름이 실행됐다”는 점과 “그 작업을 마치는 데 30분 이상 걸렸다”는 점이다.

이 경험은 로컬 LLM을 코딩 에이전트에 붙일 때 응답 품질만큼 작업 완료 시간도 중요하다는 것을 알려줬다. 짧은 질문에 답하는 모델 사용과, 파일을 확인하고 수정하며 결과를 검증하는 에이전트 작업은 체감 속도가 다르다.

## 결론

Ollama와 OpenCode, Qwen 3.6의 조합으로 로컬 코딩 에이전트를 실행하는 데는 성공했다. Codex나 Claude Code의 사용량 한도에 도달했을 때 쓸 대안을 직접 시험해 봤다는 점은 유익했다. 하지만 내 첫 시도에서는 간단한 작업에도 30분 이상 걸려 일상적인 대체 수단으로 쓰기 어려웠다.

다음에 다시 시도한다면 시스템 메모리와 GPU 사용 상태, 작업 요청의 구체적인 내용, 총 소요 시간과 도구 호출 횟수를 함께 기록해 병목을 확인해 보고 싶다. 지금의 결론은 “로컬에서도 가능하다. 다만 내 환경에서의 첫 실험은 충분히 빠르지 않았다”이다.
