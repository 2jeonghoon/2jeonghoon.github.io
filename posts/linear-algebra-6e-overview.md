---
title: "Introduction to Linear Algebra 6판: 학습 안내와 전체 목차"
description: "Gilbert Strang의 선형대수학 6판 실제 목차를 따라 벡터, 부분공간, 직교, 고유값, SVD와 응용을 공부합니다."
date: "2026-10-21"
order: 1
category: "Mathematics"
subcategory: "Introduction to Linear Algebra"
tags: ["Linear Algebra","Mathematics","Gilbert Strang","학습 목차"]
image: ""
readingTime: ""
featured: false
draft: false
aiGenerated: false
---
## 기준 도서와 공부 목적

기준 도서는 **Gilbert Strang의 『Introduction to Linear Algebra』 6판(2023)**이다. 벡터와 행렬을 계산하는 방법뿐 아니라 해가 존재하는 공간, 직교 투영, 고유 방향을 이해하는 기초 공부로 선택했다. 판본과 공개 자료는 [저자의 공식 페이지](https://math.mit.edu/~gs/linearalgebra/ila6/indexila6.html)에서 확인할 수 있다.

게임 개발에서는 벡터를 위치 계산에만 사용하지 않는다. 좌표를 바꾸고, 속도를 법선·접선 성분으로 나누고, 관성 텐서를 좌표계 사이에서 옮기고, 여러 제약의 관계를 파악할 때 같은 수학이 반복된다. 이 시리즈는 먼저 수학의 의미를 익히고 게임 적용은 별도 예로 연결한다. 게임 적용 예가 모두 원래 책에 실려 있다는 뜻은 아니다.

## 읽는 순서

아래 글은 **6판의 본문 1–10장과 부록 1–10의 순서**를 따른다. 앞선 판의 목차와 섞지 않는다. 예를 들어 6판은 독립 열과 `A = CR`을 앞부분에서 다루고, 최적화와 데이터 학습을 9–10장에 배치한다. 순서는 [저자가 공개한 목차 PDF](https://math.mit.edu/~gs/linearalgebra/ila6/Introduction%20to%20Linear%20Algebra%206th%20edition_02.pdf)로 대조했다.

| 장 | 공부 노트 |
| --- | --- |
| 1 | [벡터와 행렬](/?post=linear-algebra-6e-01-vectors-matrices) |
| 2 | [연립 선형방정식 풀기](/?post=linear-algebra-6e-02-solving-linear-equations) |
| 3 | [네 가지 기본 부분공간](/?post=linear-algebra-6e-03-four-fundamental-subspaces) |
| 4 | [직교성과 최소제곱](/?post=linear-algebra-6e-04-orthogonality) |
| 5 | [행렬식](/?post=linear-algebra-6e-05-determinants) |
| 6 | [고유값과 고유벡터](/?post=linear-algebra-6e-06-eigenvalues-eigenvectors) |
| 7 | [특잇값 분해](/?post=linear-algebra-6e-07-singular-value-decomposition) |
| 8 | [선형변환](/?post=linear-algebra-6e-08-linear-transformations) |
| 9 | [최적화에서의 선형대수학](/?post=linear-algebra-6e-09-optimization) |
| 10 | [데이터에서 학습하기](/?post=linear-algebra-6e-10-learning-from-data) |
| 부록 1–10 | [분해·수치 계산·그래픽스 참고](/?post=linear-algebra-6e-appendices) |

처음에는 1–4장에서 행렬을 열벡터의 조합으로 읽고 투영을 직접 계산한다. 이후 행렬식·고유값·SVD로 변환의 성질을 넓힌다. 물리를 병행하고 싶다면 1–4장을 공부한 뒤 [게임 물리 노트](/?post=game-physics-engine-2e-overview)의 입자 운동부터 시작해도 된다. 책을 완독해야만 실습할 수 있는 것은 아니다.

## 수식과 예제를 읽는 약속

- 기본적으로 실수와 **열벡터**를 사용한다. `Ax`는 행렬 A를 왼쪽에서 곱하는 표기다.
- `A^T`는 전치, 복소수 문맥의 `A*`는 켤레전치다. 별도 설명 없이 둘을 혼용하지 않는다.
- `A: m×n`이면 입력은 n차원이고 출력은 m차원이다. 식의 크기를 먼저 맞춘다.
- `||x||`는 별도 언급이 없으면 유클리드 길이다. 제곱 길이와 길이를 구분한다.
- 행렬은 텍스트 블록의 **한 줄을 한 행**으로 쓴다. 수식은 블로그에서 그대로 읽을 수 있도록 일반 문자와 코드 표기를 사용한다.

```text
A = [ 1  2 ]       x = [ 3 ]       Ax = [ 5 ]
    [ 0  1 ]           [ 1 ]            [ 1 ]

첫 출력: 1×3 + 2×1 = 5
둘째 출력: 0×3 + 1×1 = 1
```

숫자 예제를 손으로 풀 때는 결과만 적지 않고 어느 열을 어떤 계수로 더했는지 설명한다. 계산기를 사용할 때도 행·열 방향과 자료의 shape을 함께 기록한다.

## 자료의 범위

이 시리즈는 공개 목차, 저자의 공개 샘플, MIT 공개 강의 자료를 바탕으로 개념을 독립적으로 설명한 **개인 공부 초안**이다. 책 전체 본문을 확보해 완독한 기록이나 번역이 아니다. 주요 절의 흐름을 따르되 책의 모든 증명·연습문제·예외를 재현하지 않는다. 숫자 예제와 복습 질문은 별도 작성한다.

MIT 공개 강의는 개념을 보충하는 자료이며, 이전 연도의 강의 순서가 6판 목차와 같다고 가정하지 않는다. 학습 안내와 장별 글은 초안 상태이므로 공개 사이트의 글 목록에서 제외된다. 초안 링크는 저장소 또는 관리자 편집 화면에서 확인한다.

## 실습과 복습 방법

한 개념마다 **기하적 의미 → 식의 크기 → 작은 계산 → 전제조건 → 게임 적용** 순으로 설명해 본다. 예를 들어 투영을 배웠다면 법선이 단위벡터인지에 따라 공식을 어떻게 바꾸는지 확인한다. 역행렬을 배웠다면 역행렬이 존재하는지와 실제 계산에서 역행렬을 만드는 것이 적절한지를 따로 묻는다.

정확한 수학의 등식과 부동소수점 구현을 구분한다. 거의 종속인 열, 아주 작은 특잇값, 반복적인 좌표 변환에서는 허용 오차와 수치 안정성이 필요하다. 작은 예제가 맞았다는 사실은 모든 크기의 문제에서 안정적이라는 증명이 아니다.

## 참고 자료

### 초안 검증 기록

2026-10-19에 본문 10장과 주요 절 39개의 번호를 공개 6판 목차와 대조했다. 부록 1–10도 원래 순서대로 별도 참고 글에 담았다. 게임 물리 시리즈와 함께 대표적인 숫자·행렬 예제 77개를 별도 계산으로 검산했다. 이는 작은 예제의 산술 확인이며 모든 정리의 증명이나 임의 크기 문제의 수치 안정성 검증을 뜻하지 않는다.

두 시리즈의 장별 글 30편, 부록 글 2편, 학습 안내 2편의 분류·내부 링크·초안 상태를 확인했다. 블로그 검사 131개와 빌드도 통과했다. 모든 새 글은 공개 목록에서 제외되는 초안이다.

### 도서와 보충 자료

- [저자 공식 도서 페이지와 공개 샘플](https://math.mit.edu/~gs/linearalgebra/ila6/indexila6.html)
- [6판 공식 목차와 서문](https://math.mit.edu/~gs/linearalgebra/ila6/Introduction%20to%20Linear%20Algebra%206th%20edition_02.pdf)
- [MIT OCW 18.06: Linear Algebra](https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/)
- [MIT OCW 18.06SC: 독학용 자료](https://ocw.mit.edu/courses/18-06sc-linear-algebra-fall-2011/)
- [게임 수학을 보충할 때: 저자 공개 3D Math Primer](https://gamemath.com/book/)
