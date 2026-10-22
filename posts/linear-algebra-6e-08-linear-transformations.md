---
title: "08: 선형변환과 좋은 기저"
description: "변환 자체와 좌표 표현을 구별하고 기저변환으로 계산을 단순화한다."
date: "2026-10-19"
order: 8
category: "Mathematics"
subcategory: "Introduction to Linear Algebra"
tags: ["Linear Algebra", "Mathematics", "Study Notes"]
image: ""
readingTime: ""
featured: false
draft: true
aiGenerated: true
---

[시리즈 학습 지도](/?post=linear-algebra-6e-overview)

[6판 공식 목차](https://math.mit.edu/~gs/linearalgebra/ila6/indexila6.html)의 순서로 개념을 재구성한 개인 공부 노트다. 공개 목차와 MIT 자료를 참고했으며 책 전체 본문을 읽고 축약한 글은 아니다. 계산과 연습 예제는 직접 구성했다.

기본은 실수 열벡터이며 $A^{\mathsf T}$는 전치다. 복소수는 해당 절에서 별도로 다룬다.

## 8.1 선형변환이라는 생각

선형변환 $T$는 덧셈과 스칼라배를 보존한다.
따라서 모든 $u,v,c$에 대해 두 조건을 확인한다.

$$
\begin{gathered}
T(u+v)=T(u)+T(v),\quad T(cu)=cT(u)\\T(0)=0,\quad T(x,y)=(2x+y,y)
\end{gathered}
$$

벡터를 행렬에 곱하는 연산은 선형변환의 대표 예다.
다항식의 미분처럼 입력이 수의 열이 아니어도 선형변환을 정의할 수 있다.
도메인과 공역을 먼저 정해야 같은 식의 의미가 분명해진다.
$T(x,y)=(x+1,y)$는 원점을 옮기므로 선형이 아니다.
게임의 위치 이동은 이 의미에서 아핀변환이다.
동차좌표를 쓰면 아핀변환을 더 큰 공간의 행렬로 표현할 수 있다.
이는 원래 좌표에서 평행이동이 선형이 되었다는 뜻은 아니다.

### 직접 선형성 확인

$u=(1,2)$, $v=(3,-1)$을 위 변환에 넣어 보자.

$$
\begin{gathered}
T(u)=(4,2),\quad T(v)=(5,-1)\\T(u+v)=T(4,1)=(9,1)=T(u)+T(v)\\T(2u)=T(2,4)=(8,4)=2T(u)
\end{gathered}
$$

이 수치 확인은 일반 증명의 대체물이 아니라 이해를 돕는 검산이다.
일반식에서 $x,y$에 대한 분배법칙을 적용하면 모든 벡터에서 성립한다.
반례는 한 개로 선형성을 부정할 수 있지만 예제 몇 개로 증명할 수는 없다.

## 8.2 선형변환을 나타내는 행렬

입력 기저 벡터가 어디로 가는지 알면 전체 변환이 정해진다.
표준기저를 사용하면 그 결과를 열로 모으면 된다.

$$
\begin{gathered}
e_1=\begin{bmatrix}1\\0\end{bmatrix},\quad e_2=\begin{bmatrix}0\\1\end{bmatrix}\\T(e_1)=\begin{bmatrix}2\\0\end{bmatrix},\quad T(e_2)=\begin{bmatrix}1\\1\end{bmatrix}\\A=\begin{bmatrix}T(e_1)&T(e_2)\end{bmatrix}=\begin{bmatrix}2&1\\0&1\end{bmatrix}\\A\begin{bmatrix}3\\4\end{bmatrix}=\begin{bmatrix}10\\4\end{bmatrix}
\end{gathered}
$$

첫째 열을 첫째 행에 넣는 실수를 주의한다.
입력 기저와 출력 기저를 달리하면 행렬 표현도 달라진다.
변환 자체와 그 변환의 좌표 표현은 같은 대상이 아니다.
출력 성분이 3개이고 입력 기저가 2개이면 표현 행렬은 3×2다.
독립인 입력이 독립인 출력으로 가는 것은 영공간이 $\{0\}$일 때다.
서로 다른 입력이 같은 출력으로 합쳐지면 단사성이 깨진다.

### 합성의 순서

$S(x,y)=(x,3y)$를 추가로 생각하자.
$S$의 행렬은 $B=\operatorname{diag}(1,3)$이다.

$$
\begin{gathered}
T(S(x,y))=(2x+3y,3y),\quad AB=\begin{bmatrix}2&3\\0&3\end{bmatrix}\\S(T(x,y))=(2x+y,3y),\quad BA=\begin{bmatrix}2&1\\0&3\end{bmatrix}
\end{gathered}
$$

같은 두 변환이라도 적용 순서에 따라 결과가 달라진다.
열벡터에서는 오른쪽 변환부터 적용한다.
행벡터를 택한 그래픽 API와 옮겨 적을 때는 이 관례를 확인한다.

## 8.3 좋은 기저 찾기

기저를 바꾸면 같은 변환을 더 단순한 행렬로 표현할 수 있다.
새 기저를 열로 모은 행렬이 $B$라면 $x=B[x]_{\mathrm{new}}$다.
입력과 출력에 같은 새 기저를 쓸 때 변환 행렬은 $B^{-1}AB$다.

$$
\begin{gathered}
A=\begin{bmatrix}2&1\\0&1\end{bmatrix},\quad b_1=\begin{bmatrix}1\\0\end{bmatrix},\quad b_2=\begin{bmatrix}-1\\1\end{bmatrix}\\B=\begin{bmatrix}1&-1\\0&1\end{bmatrix},\quad B^{-1}=\begin{bmatrix}1&1\\0&1\end{bmatrix}\\Ab_1=2b_1,\quad Ab_2=b_2,\quad B^{-1}AB=\operatorname{diag}(2,1)
\end{gathered}
$$

$b_1,b_2$는 이 변환의 고유벡터다.
예를 들어 원래 좌표 $(3,2)$는 새 좌표 $(5,2)$다.
새 좌표에서 변환하면 $(10,2)$, 다시 원래 좌표로 돌아오면 $(8,2)$다.
직접 $A(3,2)=(8,2)$와 일치한다.
좋은 기저는 반복 계산의 복잡도와 해석의 어려움을 함께 줄인다.
항상 고유벡터 기저가 있는 것은 아니므로 대각화 가능성도 확인한다.
SVD는 입력과 출력에 서로 다른 정규직교 기저를 쓰는 확장으로 볼 수 있다.

## 헷갈리기 쉬운 점

- 행렬 표현의 입력·출력 차원과 좌표 관례를 먼저 확인한다.
- 정확한 수학적 결과와 유한 정밀도 알고리즘의 결과를 구별한다.
- 예제에서 확인한 성질이 일반적으로 성립하는 조건을 따로 적는다.

## 복습 질문

**질문.** B^(-1)AB에서 오른쪽 B와 왼쪽 B^(-1)는 각각 무엇을 하는가?

**짧은 답.** 오른쪽은 새 입력 좌표를 원래 좌표로, 왼쪽은 변환된 결과를 새 출력 좌표로 바꾼다.

## 함께 볼 공개 자료

[MIT OCW — 선형변환과 행렬](https://ocw.mit.edu/courses/18-06sc-linear-algebra-fall-2011/pages/positive-definite-matrices-and-applications/linear-transformations-and-their-matrices/)에서 관련 강의와 연습 자료를 확인할 수 있다. 강의 편성과 책 6판의 목차 순서는 다르다.
