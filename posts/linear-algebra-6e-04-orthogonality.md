---
title: "04: 직교와 최소제곱"
description: "직교 분해에서 투영, 최소제곱, QR과 의사역행렬까지 공부한다."
date: "2026-10-22"
order: 1
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

이 장의 목표는 벡터를 주어진 직선이나 평면 위에서 가장 가깝게 표현하는 것이다. 예를 들어 관측값 셋을 상수 하나로 요약할 때 정확히 맞출 수 없다면, 남는 차이가 가장 작은 답을 찾아야 한다. 이를 판단할 도구가 길이와 직각이다.

## 4.1 벡터와 부분공간의 직교

같은 개수의 성분을 가진 두 벡터의 **내적**은 같은 위치의 수끼리 곱한 뒤 모두 더한 값이다. 예를 들어 $(1,2)$와 $(3,4)$의 내적은 $1\cdot3+2\cdot4=11$이다. 열벡터 $u$를 가로로 눕힌 행벡터를 **전치** $u^{\mathsf T}$라 쓰면 이 계산은 $u^{\mathsf T}v$가 된다.

벡터의 **길이**, 또는 유클리드 **노름** $\|u\|$는 성분의 제곱합에 제곱근을 씌운 값이다. $(3,4)$의 길이는 $\sqrt{9+16}=5$다. 0이 아닌 두 벡터의 내적이 0이면 서로 직각이며 **직교**한다고 한다. $(1,1)$과 $(1,-1)$의 내적은 $1-1=0$이다. 모든 성분이 0인 영벡터도 계산상 모든 벡터와 직교하지만 방향을 갖지는 않는다.

부분공간은 덧셈과 수의 곱을 해도 그 안에 머무르는 벡터 집합이다. 그 안의 모든 벡터를 중복 없이 조합해 만드는 기본 벡터들을 **기저**라 한다. 두 부분공간이 직교한다는 것은 한쪽의 모든 벡터가 다른 쪽의 모든 벡터와 직교한다는 뜻이다. 기저 사이의 내적만 검사해도 되는 이유는 내적이 덧셈에 따라 나뉘기 때문이다. 아래에서 $r_1^{\mathsf T}n=r_2^{\mathsf T}n=0$이면 $(cr_1+dr_2)^{\mathsf T}n=c\cdot0+d\cdot0=0$이다. 세 벡터는 모두 성분이 3개다.

$$
\begin{gathered}
r_1=\begin{bmatrix}1\\2\\3\end{bmatrix},\quad r_2=\begin{bmatrix}0\\1\\1\end{bmatrix},\quad n=\begin{bmatrix}-1\\-1\\1\end{bmatrix}\\r_1^{\mathsf T}n=-1-2+3=0\\r_2^{\mathsf T}n=0-1+1=0
\end{gathered}
$$

$A$가 $m\times n$이면 행공간은 행들을 조합한 벡터 전체, 영공간은 $Ax=0$인 입력 전체다. 둘 다 성분이 $n$개인 공간 $\mathbb R^n$에 있다. $Ax=0$의 각 식이 각 행과 $x$의 내적이 0이라는 뜻이므로 두 공간은 직교한다.

열공간은 열들을 조합한 출력 전체이고, 왼쪽 영공간은 $A^{\mathsf T}y=0$인 $y$ 전체다. 행렬의 전치는 행과 열을 맞바꾸므로 $A^{\mathsf T}$는 $n\times m$이다. 이 식도 각 열과 $y$의 내적이 0이라는 뜻이어서 두 공간은 $\mathbb R^m$ 안에서 직교한다.
단순히 서로 겹치는 벡터가 0뿐이라는 조건만으로 직교하지는 않는다.
예를 들어 $(1,0)$의 직선과 $(1,1)$의 직선은 교집합이 $\{0\}$이지만 직각은 아니다.
따라서 0 이외에 겹치는 벡터가 없다는 사실만으로 직각이라고 결론 내리면 안 된다.

## 4.2 직선과 부분공간으로의 투영

$a\ne0$의 모든 배수 $ca$가 이루는 직선을 $\operatorname{span}(a)$라 쓴다. **투영**은 $b$에서 이 직선으로 가장 가깝게 내려간 점 $p$다. 그 점에서 직선을 따라 더 움직이면 직각삼각형의 빗변처럼 거리가 길어지므로, 남은 차이 $e=b-p$는 직선과 수직이어야 한다.

$p=ca$를 대입하면 $a^{\mathsf T}(b-ca)=0$이고, 이를 풀면 $c=(a^{\mathsf T}b)/(a^{\mathsf T}a)$다. 분모는 $a$의 길이 제곱이라 $a\ne0$이면 나눌 수 있다. 다음 벡터들은 2성분이다. $P$는 $Pb=p$가 되도록 만든 $2\times2$ 투영행렬이다.

$$
\begin{gathered}
a=\begin{bmatrix}1\\1\end{bmatrix},\quad b=\begin{bmatrix}3\\1\end{bmatrix}\\c=\frac{a^{\mathsf T}b}{a^{\mathsf T}a}=\frac42=2\\p=ca=\begin{bmatrix}2\\2\end{bmatrix},\quad e=b-p=\begin{bmatrix}1\\-1\end{bmatrix},\quad a^{\mathsf T}e=0\\P=\frac{aa^{\mathsf T}}{a^{\mathsf T}a}=\begin{bmatrix}\frac12&\frac12\\\frac12&\frac12\end{bmatrix}
\end{gathered}
$$

$P^2=P$이므로 한 번 투영한 점을 다시 투영해도 바뀌지 않는다.
이 직교투영은 $P^{\mathsf T}=P$도 만족한다.
$A$가 $m\times n$이고 열들이 독립, 즉 어느 열도 다른 열들의 조합으로 만들 수 없다면 $A^{\mathsf T}A$에는 역행렬이 있다. 역행렬은 행렬을 곱하기 전 입력으로 되돌리는 행렬이다. 이때 열공간에는 $P=A(A^{\mathsf T} A)^{-1}A^{\mathsf T}$로 투영한다.
열이 종속이면 이 역행렬 공식은 그대로 쓸 수 없다.
그때도 투영은 존재하며 의사역행렬로 표현할 수 있다.

## 4.3 최소제곱 근사

$A$가 $m\times n$이면 입력 $x$는 $n$성분이고 관측 $b$와 출력 $Ax$는 $m$성분이다. $b$가 열공간 밖에 있으면 정확한 $Ax=b$는 불가능하다. 이때 각 관측과 예측의 차이를 제곱해서 더한 $\|Ax-b\|^2$를 가장 작게 하는 방법이 **최소제곱**이다. 제곱을 쓰면 양수 오차와 음수 오차가 서로 취소되지 않는다.

가장 잘 맞는 입력을 $\widehat x$라 쓰고, 남은 차이 $b-A\widehat x$를 **잔차**라 한다. 투영에서처럼 최적 출력의 잔차는 모든 열과 수직이다. 어느 열 방향으로 움직여도 더 가까워질 수 없기 때문이다. 다음 $A$는 $3\times1$이라 미지수는 상수 하나다.

$$
\begin{gathered}
A=\begin{bmatrix}1\\1\\1\end{bmatrix},\quad b=\begin{bmatrix}1\\2\\6\end{bmatrix}\\A^{\mathsf T}A=3,\quad A^{\mathsf T}b=9,\quad \widehat x=3\\b-A\widehat x=\begin{bmatrix}-2\\-1\\3\end{bmatrix},\quad -2-1+3=0\\\|b-A\widehat x\|^2=4+1+9=14
\end{gathered}
$$

이는 세 관측값에 같은 상수 하나를 맞추는 문제다.
각 열과 잔차의 내적을 0으로 놓으면 $A^{\mathsf T}(b-A\widehat x)=0$이다. 이를 정리한 $A^{\mathsf T}A\widehat x=A^{\mathsf T}b$를 **정규방정식**이라 한다. 위에서는 $3\widehat x=9$라서 관측의 평균 3을 얻는다.
독립인 열이면 해가 유일하다.
열이 종속이면 같은 출력을 만드는 입력이 여럿일 수 있다. 하지만 가장 가까운 출력은 유일하다. 서로 다른 두 최적 출력이 있다고 가정하면 둘의 중간점도 열공간에 있고, 직각 투영의 거리 비교에 어긋나기 때문이다.
입력의 작은 오차가 답을 얼마나 크게 바꿀 수 있는지를 나타내는 수를 **조건수**라 한다. 독립인 열을 가진 $A$에서 $A^{\mathsf T}A$의 2-노름 조건수는 $A$의 조건수의 제곱이다. 거의 겹치는 열이 있으면 이 식을 만드는 과정에서 계산 오차의 영향이 커질 수 있어, 다음 절의 QR이나 7장의 SVD가 유리할 수 있다.
관측 오차가 큰 점을 자동으로 무시하는 방법은 아니라는 점도 기억한다.

## 4.4 정규직교 기저와 Gram–Schmidt

길이가 1인 벡터를 **단위벡터**라 한다. 0이 아닌 벡터를 그 길이로 나누면 방향은 유지되고 길이만 1이 된다. 서로 직교하면서 각각 길이가 1인 벡터들은 **정규직교**한다고 한다. 이런 기저를 쓰면 좌표를 구할 때 내적만 계산하면 된다.

**Gram–Schmidt 방법**은 독립인 벡터들에서 같은 공간을 만드는 정규직교 기저를 얻는 절차다. 첫 벡터를 길이 1로 만든 뒤, 둘째 벡터에서 첫 방향으로의 투영을 뺀다. 겹치는 성분이 사라져 수직인 방향만 남으므로 이를 다시 길이로 나눈다.

다음 벡터들은 2성분이고 $A,Q,R$은 $2\times2$다. $a_1$의 길이는 $\sqrt2$, $q_1^{\mathsf T}a_2=1/\sqrt2$이므로 $a_2$에서 뺄 투영은 $(1/2,1/2)$다. 남은 $v_2$의 길이는 $1/\sqrt2$다.

$$
\begin{gathered}
a_1=\begin{bmatrix}1\\1\end{bmatrix},\quad a_2=\begin{bmatrix}1\\0\end{bmatrix},\quad q_1=\frac1{\sqrt2}\begin{bmatrix}1\\1\end{bmatrix}\\v_2=a_2-q_1(q_1^{\mathsf T}a_2)=\begin{bmatrix}\frac12\\-\frac12\end{bmatrix},\quad q_2=\frac1{\sqrt2}\begin{bmatrix}1\\-1\end{bmatrix}\\R=\begin{bmatrix}\sqrt2&1/\sqrt2\\0&1/\sqrt2\end{bmatrix}\\A=\begin{bmatrix}a_1&a_2\end{bmatrix}=QR,\quad Q=\begin{bmatrix}q_1&q_2\end{bmatrix}
\end{gathered}
$$

$Q^{\mathsf T}Q$의 성분은 열끼리의 내적이다. 같은 열은 길이 제곱 1, 다른 열은 0이므로 대각에 1만 있는 항등행렬 $I$가 된다. 따라서 $b=Qc$이면 $Q^{\mathsf T}b=c$로 좌표를 얻는다.
$A=QR$처럼 나누는 것을 **QR 분해**라 한다. $R$의 각 열은 원래 열을 $q_1,q_2$로 조합하는 계수다. 첫째 열은 $a_1=\sqrt2q_1$이라 계수가 $(\sqrt2,0)$이고, 둘째 열은 $a_2=(q_1+q_2)/\sqrt2$라 계수가 $(1/\sqrt2,1/\sqrt2)$다. 나중에 만든 방향은 앞선 열에 필요하지 않아 $R$의 대각 아래가 0이 된다.

독립인 열이 $n$개인 $m\times n$ 행렬에서도 $Q$를 $m\times n$, $R$을 $n\times n$으로 만들 수 있다. 잔차가 $Q$의 모든 열에 수직이라는 조건은 $Q^{\mathsf T}(b-QR\widehat x)=0$이고, $Q^{\mathsf T}Q=I$이므로 $R\widehat x=Q^{\mathsf T}b$다. 이것이 QR로 최소제곱을 푸는 방법이다. 대각 아래가 0인 식이므로 마지막 미지수부터 거꾸로 구하면 된다.
새 벡터가 기존 벡터들의 조합으로 표현되는 공간인 span에 있으면 뺀 결과가 0이 되어 정규화할 수 없다.
컴퓨터가 소수를 유한한 자리로 저장하는 계산에서는, 직교성을 더 잘 유지하는 수정 Gram–Schmidt나 반사를 이용하는 Householder QR 같은 구현을 고려한다.

## 4.5 의사역행렬

보통 역행렬은 정사각형이면서 입력 정보를 잃지 않는 행렬에만 있다. 그런데 같은 출력을 만드는 입력이 여럿일 때도 하나의 답을 고르고 싶다. **Moore–Penrose 의사역행렬** $A^+$는 잔차 길이를 최소화한 해들 중 입력 길이가 가장 작은 해를 고른다. $A$가 $m\times n$이면 $A^+$는 $n\times m$이고 답은 $x=A^+b$다.

다음 $A$는 $1\times2$라 식은 $x_1+x_2=2$ 하나다. 해들을 $(1+t,1-t)$로 쓰고 길이 제곱을 비교하면 왜 $(1,1)$을 고르는지 확인할 수 있다.

$$
\begin{gathered}
A=\begin{bmatrix}1&1\end{bmatrix},\quad b=2,\quad A^+=\begin{bmatrix}\frac12\\\frac12\end{bmatrix}\\x=A^+b=\begin{bmatrix}1\\1\end{bmatrix},\quad Ax=2\\x(t)=\begin{bmatrix}1+t\\1-t\end{bmatrix},\quad \|x(t)\|^2=2+2t^2
\end{gathered}
$$

노름이 최소인 시점은 $t=0$이다.
$AA^+$는 열공간, $A^+A$는 행공간으로의 직교투영이다.
가역 정사각행렬에서만 의사역행렬이 보통의 역행렬과 일치한다.
7장에서 배울 특잇값은 각 입력 방향이 얼마나 늘어나는지 나타내는 음이 아닌 수다. 작은 특잇값의 역수를 취하면 오차가 커질 수 있으므로, 컴퓨터에서 이를 0으로 취급할 기준은 데이터 오차와 함께 정한다.

## 헷갈리기 쉬운 점

- 기호의 크기를 먼저 적고 행렬곱의 안쪽 차원이 맞는지 확인한다.
- 공식의 가역성·독립성 조건을 지운 채 적용하지 않는다.
- 손계산의 결과를 원래 식에 대입해 확인한다.

## 복습 질문

**질문.** 최소제곱 해가 여러 개면 투영된 출력도 여러 개인가?

**짧은 답.** 아니다. 최적 출력은 유일하며 의사역행렬은 해 가운데 최소노름 해를 고른다.

## 함께 볼 공개 자료

[MIT OCW — 투영행렬과 최소제곱](https://ocw.mit.edu/courses/18-06sc-linear-algebra-fall-2011/pages/least-squares-determinants-and-eigenvalues/projection-matrices-and-least-squares/)에서 관련 강의와 연습 자료를 확인할 수 있다. 강의 편성과 책 6판의 목차 순서는 다르다.
