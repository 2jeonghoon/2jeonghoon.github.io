---
title: "02: 연립방정식 Ax = b 풀기"
description: "소거, 역행렬, LU, 순열과 전치를 같은 연립방정식으로 연결한다."
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

기본은 실수 열벡터이며 $A^T$는 전치다. 하나의 연립방정식으로 소거부터 LU 분해까지 계산을 이어 간다.

## 2.1 소거와 후진대입

소거는 방정식의 해를 유지하면서 아래쪽 계수를 0으로 만든다.
한 행에 다른 행의 배수를 더하는 작업을 우변에도 똑같이 적용한다.
다음 예제에서는 첫 피벗 2를 사용한다.

$$
\begin{cases}
2x_1+x_2=5\\
4x_1+3x_2=11
\end{cases}
\qquad
A\mathbf{x}=b,\quad
A=\begin{bmatrix}2&1\\4&3\end{bmatrix},\quad
\mathbf{x}=\begin{bmatrix}x_1\\x_2\end{bmatrix},\quad
b=\begin{bmatrix}5\\11\end{bmatrix}.
$$

행은 가로줄, 열은 세로줄이다. $A$의 첫째 행 $[2,1]$과 둘째 행 $[4,3]$은 각 식의 계수다.
첫째 열은 $x_1$의 계수들, 둘째 열은 $x_2$의 계수들이다.
식 하나를 다른 식과 더하거나 빼는 작업이므로 여기서는 **행 연산**을 한다.

둘째 식의 $x_1$을 없애려면 $4-2\times2=0$으로 만든다.
따라서 둘째 식에서 첫째 식의 $4/2=2$배를 뺀다.

$$
\begin{aligned}
(4x_1+3x_2)-2(2x_1+x_2)&=11-2\times5\\
(4-4)x_1+(3-2)x_2&=1\\
x_2&=1.
\end{aligned}
$$

첫째 식에 $x_2=1$을 넣으면 $2x_1+1=5$이므로 $x_1=2$다.

피벗은 현재 소거 단계에서 기준으로 사용하는 0이 아닌 원소다.
삼각형 구조를 만든 다음 마지막 변수부터 찾는 과정이 후진대입이다.
0인 피벗으로 나누면 안 된다.
교환할 행을 찾거나, 해당 열을 자유변수 후보로 남겨야 한다.
소거 결과 $0=1$이 나오면 해가 없다.
$0=0$은 새로운 제약이 없다는 뜻이며 그 자체로 모순은 아니다.

## 2.2 소거행렬과 역행렬

행 연산을 왼쪽의 행렬곱으로 표현하면 소거 자체도 선형변환이다.
첫째 행을 $R_1$, 둘째 행을 $R_2$라 하자. 원하는 연산은 다음과 같다.

$$
\begin{aligned}
\text{새 첫째 행}&=1R_1+0R_2,\\
\text{새 둘째 행}&=-2R_1+1R_2.
\end{aligned}
\qquad
E=\begin{bmatrix}1&0\\-2&1\end{bmatrix}.
$$

**$E$의 각 행은 원래 행들을 몇 배씩 가져올지 정하는 지시다.**
첫째 행의 $[1,0]$에서 $0$은 결과에 0을 쓰라는 뜻이 아니다.
첫째 행은 1배 가져오고 둘째 행은 0배 가져오므로 첫째 행이 유지된다.
$[1,1]$로 쓰면 두 행을 더하게 되어 첫째 행이 바뀐다.

행렬곱의 각 원소는 **왼쪽 행렬의 행과 오른쪽 행렬의 열**을 곱해서 더한다.
실제로 네 원소를 모두 계산하면 다음과 같다.

$$
EA=
\begin{bmatrix}1&0\\-2&1\end{bmatrix}
\begin{bmatrix}2&1\\4&3\end{bmatrix}
=\begin{bmatrix}
1\cdot2+0\cdot4&1\cdot1+0\cdot3\\
(-2)\cdot2+1\cdot4&(-2)\cdot1+1\cdot3
\end{bmatrix}
=\begin{bmatrix}2&1\\0&1\end{bmatrix}.
$$

계수만 바꾸면 다른 방정식이 된다. 우변에도 같은 행 연산을 적용해야 해가 유지된다.

$$
Eb=
\begin{bmatrix}1&0\\-2&1\end{bmatrix}
\begin{bmatrix}5\\11\end{bmatrix}
=\begin{bmatrix}1\cdot5+0\cdot11\\(-2)\cdot5+1\cdot11\end{bmatrix}
=\begin{bmatrix}5\\1\end{bmatrix}.
$$

$EA$는 **계수행렬에 행 연산을 적용한 결과**, $Eb$는 **우변에 같은 연산을 적용한 결과**다.
따라서 $(EA)\mathbf{x}=Eb$는 $2x_1+x_2=5$, $x_2=1$을 나타낸다.

### 소거를 되돌리는 역행렬

$E$는 둘째 행에서 첫째 행의 2배를 뺐다.
되돌리려면 첫째 행의 2배를 더하므로 역행렬은 다음과 같다.

$$
E^{-1}=\begin{bmatrix}1&0\\2&1\end{bmatrix},\qquad
E^{-1}(EA)=A,\quad E^{-1}(Eb)=b.
$$

$E^{-1}$의 $-1$은 **연산을 되돌리는 역행렬**이라는 표시이며 각 원소의 역수를 뜻하지 않는다.
단위행렬 $I$는 곱해도 상대 행렬을 그대로 유지하며, $E^{-1}E=I$다.

한편 $A^{-1}$은 $E^{-1}$과 다르다. $A$가 가역이면 $A^{-1}A=AA^{-1}=I$이므로
$A\mathbf{x}=b$에서 $\mathbf{x}=A^{-1}b$를 얻는다. 이 예제에서는 다음과 같다.

$$
A^{-1}=\frac12\begin{bmatrix}3&-1\\-4&2\end{bmatrix},\qquad
A^{-1}b=\frac12\begin{bmatrix}3\cdot5-11\\-4\cdot5+2\cdot11\end{bmatrix}
=\begin{bmatrix}2\\1\end{bmatrix}.
$$

하지만 해 하나를 구하기 위해 역행렬 전체를 먼저 만들 필요는 없다.
보통 소거와 대입으로 푸는 편이 계산량과 수치적 측면에서 유리하다.

## 2.3 행렬 계산과 A = LU

소거 결과를 $U$라고 부르자. 주대각선 아래가 0인 **상삼각행렬**이다.
앞에서 $EA=U$를 구했으므로, 양쪽 왼쪽에 $E^{-1}$을 곱하면 다음과 같다.

$$
EA=U
\quad\Longrightarrow\quad E^{-1}EA=E^{-1}U
\quad\Longrightarrow\quad A=E^{-1}U.
$$

이 예제에서는 $L=E^{-1}$로 두면 $A=LU$가 된다.
$L$은 주대각선 위가 0인 **하삼각행렬**이다.
즉 $U$는 소거한 결과이고, $L$은 그 결과를 원래 $A$로 복원한다.

### LU의 네 원소를 직접 계산하기

$$
L=\begin{bmatrix}1&0\\2&1\end{bmatrix},\qquad
U=\begin{bmatrix}2&1\\0&1\end{bmatrix}.
$$

왼쪽의 행과 오른쪽의 열을 하나씩 짝지어 계산한다.

$$
\begin{aligned}
(LU)_{11}&=1\cdot2+0\cdot0=2,\\
(LU)_{12}&=1\cdot1+0\cdot1=1,\\
(LU)_{21}&=2\cdot2+1\cdot0=4,\\
(LU)_{22}&=2\cdot1+1\cdot1=3.
\end{aligned}
$$

각 값을 제자리에 넣으면 원래 행렬이 나온다.

$$
LU=\begin{bmatrix}2&1\\4&3\end{bmatrix}=A.
$$

행으로 읽으면 $U$의 둘째 행 $[0,1]$에 첫째 행 $[2,1]$의 2배를 더해서
$[0,1]+2[2,1]=[4,3]$을 복원한 것이다.
더 큰 행렬에서 소거가 여러 번 필요하면 그 소거들을 되돌리는 행렬의 곱이 $L$이 된다.

### 왜 Lc = b, Ux = c를 차례로 푸는가?

$A=LU$를 원래 식에 넣으면 $L(U\mathbf{x})=b$다.
여기서 $U\mathbf{x}$를 중간 벡터 $c$라고 부르면 두 단계로 나뉜다.

$$
A\mathbf{x}=b
\quad\Longleftrightarrow\quad
\begin{cases}Lc=b,\\U\mathbf{x}=c.\end{cases}
$$

**먼저 $Lc=b$에서 $c$를 구한다.**

$$
\begin{bmatrix}1&0\\2&1\end{bmatrix}
\begin{bmatrix}c_1\\c_2\end{bmatrix}
=\begin{bmatrix}5\\11\end{bmatrix}
\quad\Longrightarrow\quad
\begin{cases}c_1=5,\\2c_1+c_2=11.\end{cases}
$$

위에서부터 대입하면 $c_1=5$, $c_2=11-2\times5=1$이다.
이것이 **전진대입**이다. 여기서는 $L=E^{-1}$이므로 $c=Eb$와 같다.

**다음으로 $U\mathbf{x}=c$에서 해를 구한다.**

$$
\begin{bmatrix}2&1\\0&1\end{bmatrix}
\begin{bmatrix}x_1\\x_2\end{bmatrix}
=\begin{bmatrix}5\\1\end{bmatrix}
\quad\Longrightarrow\quad
\begin{cases}2x_1+x_2=5,\\x_2=1.\end{cases}
$$

아래에서부터 대입하면 $x_2=1$, $x_1=(5-1)/2=2$다.
이것이 **후진대입**이다. 삼각행렬에는 0이 있어서 미지수를 하나씩 구할 수 있다.

같은 $A$로 우변만 바꾸는 문제에서는 $L,U$를 다시 계산하지 않고 대입 과정만 반복한다.
예를 들어 $b=(1,3)^T$이면 $c=(1,1)^T$, $\mathbf{x}=(0,1)^T$이다.
$L$의 대각성분을 1로 두는 것은 이 분해에서 택한 관례다.
행 교환이 필요한 경우에는 다음 절의 $P$가 함께 등장한다.

## 2.4 순열과 전치

순열행렬은 행의 위치를 바꾼다.
첫 피벗이 0이어도 아래에 0이 아닌 값이 있으면 행 교환으로 진행한다.

$$
B=\begin{bmatrix}0&1\\2&3\end{bmatrix},\qquad
P=\begin{bmatrix}0&1\\1&0\end{bmatrix},\qquad
PB=\begin{bmatrix}2&3\\0&1\end{bmatrix},\qquad P^TP=I.
$$

부분 피벗팅을 사용하는 소거에서는 보통 $PA=LU$로 기록한다.
문헌에 따라 순열을 반대쪽에 두므로 구현의 정의를 확인한다.
전치 $A^T$는 행과 열을 서로 바꾼다.

$$
A=\begin{bmatrix}2&1\\4&3\end{bmatrix}
\quad\Longrightarrow\quad A^T=\begin{bmatrix}2&4\\1&3\end{bmatrix}.
$$

곱을 전치하면 순서가 뒤집혀 $(AB)^T=B^TA^T$가 된다.
실수 행렬에서 내적을 $x^Ty$로 쓰는 이유도 여기 있다.

### 수치 계산 메모

행 교환은 정확한 산술에서 가역성을 바꾸지 않는다.
부동소수점에서는 작은 피벗으로 나눌 때 오차가 커질 수 있다.
부분 피벗팅은 현재 열에서 절댓값이 큰 피벗 후보를 고른다.
이것이 모든 행렬의 나쁜 조건을 해결해 주는 것은 아니다.
계산 결과는 $A\mathbf{x}-b$의 잔차도 확인한다.

## 헷갈리기 쉬운 점

- 기호의 크기를 먼저 적고 행렬곱의 안쪽 차원이 맞는지 확인한다.
- 공식의 가역성·독립성 조건을 지운 채 적용하지 않는다.
- 손계산의 결과를 원래 식에 대입해 확인한다.

## 복습 질문

**질문.** LU를 한 번 구하면 어떤 계산을 재사용할 수 있는가?

**짧은 답.** 계수행렬이 같을 때 소거 분해를 재사용하고 새 우변에 전진·후진대입한다.

## 함께 볼 공개 자료

[MIT OCW — 행렬을 이용한 소거](https://ocw.mit.edu/courses/18-06sc-linear-algebra-fall-2011/pages/ax-b-and-the-four-subspaces/elimination-with-matrices/)에서 관련 강의와 연습 자료를 확인할 수 있다. 강의 편성과 책 6판의 목차 순서는 다르다.
