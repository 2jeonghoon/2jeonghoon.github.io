---
title: "01: 벡터와 행렬"
description: "벡터의 선형결합에서 열공간과 CR 분해까지 연결한다."
date: "2026-10-21"
order: 2
category: "Mathematics"
subcategory: "Introduction to Linear Algebra"
tags: ["Linear Algebra","Mathematics","Study Notes"]
image: ""
readingTime: ""
featured: false
draft: false
aiGenerated: false
---
[시리즈 학습 지도](/?post=linear-algebra-6e-overview)

[6판 공식 목차](https://math.mit.edu/~gs/linearalgebra/ila6/indexila6.html)의 순서로 개념을 재구성한 개인 공부 노트다. 공개 목차와 MIT 강의 자료를 참고했으며 책 전체 본문을 읽고 축약한 글은 아니다. 계산과 연습 예제는 직접 구성했다.

기본은 실수 열벡터이며 $A^{\mathsf T}$는 전치다. 행렬은 대괄호 안에 행과 열을 맞추어 표시한다.

## 1.1 벡터와 선형결합

벡터는 순서가 있는 수의 묶음이다.
이 노트에서 $(2, 1)$은 별도 언급이 없으면 열벡터다.
두 벡터의 덧셈은 같은 위치의 성분끼리 더한다.
스칼라배는 모든 성분에 같은 수를 곱한다.
선형결합은 이 두 연산만으로 만든 식이다.

$$
\begin{gathered}
u=\begin{bmatrix}2\\1\end{bmatrix},\quad v=\begin{bmatrix}-1\\2\end{bmatrix}\\3u+2v=\begin{bmatrix}6\\3\end{bmatrix}+\begin{bmatrix}-2\\4\end{bmatrix}=\begin{bmatrix}4\\7\end{bmatrix}\\\operatorname{span}(u,v)=\{cu+dv:c,d\in\mathbb R\}
\end{gathered}
$$

$\operatorname{span}$은 특정 결과 하나가 아니라 가능한 결과 전체다.
계수가 음수이면 방향이 뒤집히며 정수일 필요도 없다.
$u$와 $v$가 평행하지 않으므로 둘의 선형결합은 평면 전체를 채운다.
계수에 $c+d=1$ 조건을 추가하면 일반적인 선형결합과 다른 집합이 된다.
그 조건을 만족하는 조합은 아핀결합이라고 부른다.

## 1.2 내적으로 구하는 길이와 각도

실수 벡터의 내적은 대응 성분의 곱을 모두 더한 값이다.
내적의 결과는 벡터가 아니라 스칼라다.
자기 자신과의 내적은 길이의 제곱이다.

$$
\begin{gathered}
u^\mathsf{T}v=2(-1)+1(2)=0\\\|u\|=\sqrt{u^\mathsf{T}u}=\sqrt5,\quad \|v\|=\sqrt5\\u^\mathsf{T}v=\|u\|\|v\|\cos\theta
\end{gathered}
$$

두 벡터 모두 영벡터가 아니므로 내적 0은 직각을 뜻한다.
영벡터는 모든 벡터와 내적이 0이지만 방향과 각도는 정의되지 않는다.
단위벡터는 $\frac{u}{\|u\|}$로 얻는다.
길이가 0에 매우 가까운 벡터는 구현에서 별도로 처리해야 한다.
게임에서 시선과 목표 방향의 내적을 쓰려면 먼저 정규화 여부를 확인한다.
이 연결은 책의 예제를 옮긴 것이 아니라 개념의 응용이다.

## 1.3 행렬과 열공간

$m\times n$ 행렬은 $n$개의 입력 성분을 $m$개의 출력 성분으로 보낸다.
행렬과 벡터의 곱은 열들의 선형결합으로 읽을 수 있다.

$$
\begin{gathered}
A=\begin{bmatrix}1&2&3\\0&1&1\end{bmatrix},\quad x=\begin{bmatrix}2\\-1\\1\end{bmatrix}\\Ax=2\begin{bmatrix}1\\0\end{bmatrix}-\begin{bmatrix}2\\1\end{bmatrix}+\begin{bmatrix}3\\1\end{bmatrix}=\begin{bmatrix}3\\0\end{bmatrix}
\end{gathered}
$$

첫 열과 둘째 열만으로 이미 평면 전체를 만들 수 있다.
셋째 열은 첫째 열과 둘째 열의 합이라 새로운 방향을 추가하지 않는다.
열공간 $C(A)$는 가능한 모든 $Ax$의 집합이다.
행렬의 열이 3개라는 사실과 열공간의 차원이 3이라는 주장은 다르다.
이 예제는 출력 공간이 2차원이므로 열공간 차원이 2를 넘을 수도 없다.
$Ax=b$를 풀 수 있는 조건은 $b$가 이 열공간에 들어가는 것이다.

## 1.4 행렬곱 AB와 CR

$AB$의 각 열은 $A$에 $B$의 해당 열을 곱한 것이다.
$A$가 $m\times n$, $B$가 $n\times p$이면 결과는 $m\times p$다.
행렬곱의 순서는 합성하는 변환의 순서와 연결된다.
열벡터에서 $ABx$는 $B$를 먼저 적용한다.

$$
\begin{gathered}
C=\begin{bmatrix}1&2\\0&1\end{bmatrix},\quad R=\begin{bmatrix}1&0&1\\0&1&1\end{bmatrix}\\CR=\begin{bmatrix}1&2&3\\0&1&1\end{bmatrix}=A
\end{gathered}
$$

$C$는 원래 행렬에서 고른 독립인 열을 보관한다.
$R$의 각 열은 그 열을 $C$의 열들로 만드는 계수다.
세 번째 열의 계수 $(1,1)$이 열 사이의 관계를 드러낸다.
$CR$ 분해에서의 $R$은 뒤의 $QR$ 분해에서 쓰는 삼각행렬 이름과 구별한다.
기호가 같아도 분해의 목적과 크기가 다를 수 있다.

### 직접 확인

$R(2,-1,1)=(3,0)$이고 $C(3,0)=(3,0)$이다.
따라서 $(CR)x=C(Rx)$가 이 예제에서도 성립한다.
행렬곱은 결합법칙을 만족하지만 보통 교환법칙은 만족하지 않는다.

## 헷갈리기 쉬운 점

- 기호의 크기를 먼저 적고 행렬곱의 안쪽 차원이 맞는지 확인한다.
- 공식의 가역성·독립성 조건을 지운 채 적용하지 않는다.
- 손계산의 결과를 원래 식에 대입해 확인한다.

## 복습 질문

**질문.** 벡터가 세 개면 span의 차원도 반드시 3인가?

**짧은 답.** 아니다. 독립인 벡터 수가 차원이며 위 예제는 2다.

## 함께 볼 공개 자료

[MIT OCW — 선형방정식의 기하](https://ocw.mit.edu/courses/18-06sc-linear-algebra-fall-2011/pages/ax-b-and-the-four-subspaces/the-geometry-of-linear-equations/)에서 관련 강의와 연습 자료를 확인할 수 있다. 강의 편성과 책 6판의 목차 순서는 다르다.
