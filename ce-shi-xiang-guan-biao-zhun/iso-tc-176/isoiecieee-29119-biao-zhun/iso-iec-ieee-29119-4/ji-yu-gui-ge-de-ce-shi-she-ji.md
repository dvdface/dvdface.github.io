# 基于规格的测试设计

## 等价类划分\(Equivalence Partitioning\)

### 背景

等价类划分主要对被测对象的输入、输出\(使用输出反推输入\)域进行等价类划分，要求每个划分，系统处理它的行为是类似的；

由于等价划分数量是有限的，因此方法能有效的减少测试用例的数量；

等价类典型的用法是把输入分为有效和无效两个等价类；常常和边界值联用；

### 用法

#### Feature Set -&gt; Test Condition

等价类划分把被测对象输入或输出进行等价划分，每个划分下系统处理类似，并把每个划分作为一个测试规格；

常使用等价划分把输入或输出分为有效和无效两个类型；

对输出进行等价划分时，可以根据测试规格书中所描述的处理过程，推导对应输入的等价划分；

#### Test Condition -&gt; Test Coverage Item

每个等价划分都是一个测试覆盖项；

#### Test Coverage Item -&gt; Test Case

1. 确定如何使用测试用例覆盖测试覆盖项：
   * 一条用例覆盖一个覆盖项；
   * 一条用例覆盖多个覆盖项；
2. 选取要进行覆盖的测试覆盖项；
3. 确定测试用例的输入参数；
4. 确定测试用例的预期输出；
5. 重复2~4，直到覆盖所有测试覆盖项；

### 测试覆盖度量

等价划分覆盖 = 测试用例覆盖的等价划分数 / 等价划分总数；

## [分类树\(Classification Tree Method\)](https://aneejian.com/classification-tree-method-crack-istqb/#what-is-the-classification-tree-method)

### 背景

分类树首先会对测试对象的输入\(可以是输入参数，也可以是预置条件等等\)做分类分析\(Classification\)，看有多少个输入类型；再看看每个输入类型下，各有多少类的输入参数\(常用等价类的方式进行划分\)；得到了输入分类和类之后，应用组合测试设计推导对应的测试覆盖项；

分类树方法应用范围很广，适用硬件系统、硬件软件集成系统、纯软件系统\(嵌入式系统、UI、OS等等\)；

### 用法

#### Feature Set -&gt; Test Condition

![](../../../../.gitbook/assets/image%20%28105%29.png)

分类树把被测对象输入划分为多个分类\(Classification\)，每个分类的输入再分为多个类型\(Class、SubClass\)，并以树的形式进行展现；见上图；

分类树中的每个分类\(Classification\)都是一个测试规格，如，Privilege、Operation、Access Method；

#### Test Condition -&gt; Test Coverage Item

根据前面的测试规格，生成测试覆盖项；

* **Minimized**

  最小覆盖法，即每个分类的类型取值至少覆盖一次；

* **Maximized** 最大覆盖法，即每个分类的类型取值组合至少覆盖一次；

#### Test Coverage Item -&gt; Test Case

1. 根据测试覆盖项，编写测试用例，选择一个组合进行覆盖；
2. 明确测试用例的输入值；
3. 明确测试用例的预期输出；
4. 重复1~3，直到达到测试覆盖诉求；

### 测试覆盖度量

* **Minimized** 分类树测试覆盖 = 测试用例覆盖的类型数量 / 分类树中的类型总数 ****
* **Maximized** 分类树测试覆盖 = 测试用例覆盖的类型组合数量  / 分类树中的所有类型组合数

## 边界值分析\(Boundary Value Analysis\)

### 背景

边界值分析把边界值的测试考虑在内，将边界值作为测试规格；常常和等价类划分联用；

### 用法

#### Feature Set -&gt; Test Condition

将被测对象的输入、输出划分为有序集合，并识别其中边界子集，将每个边界作为测试规格；

如， 从\[1, 9\]推倒出两个测试规格，分别是1和9这两个边界值；

#### Test Condition -&gt; Test Coverage Item

测试覆盖项有两种推导方式：

* **Two-value boundary** 两个取值分别为：边界值，边界外侧的值； 如， 边界值1需要测试0和1；
* **Three-value boundary** 三个取值分别为：边界值，边界两侧各一个值； 如，边界值1需要测试0、1、2；

#### Test Coverage Item -&gt; Test Case

1. 确定如何使用测试用例覆盖测试覆盖项：
   * 一条用例覆盖一个覆盖项；
   * 一条用例覆盖多个覆盖项；
2. 选取要进行覆盖的测试覆盖项；
3. 确定测试用例的输入参数；
4. 确定测试用例的预期输出；
5. 重复2~4，直到覆盖所有测试覆盖项；

### 测试覆盖度量

边界值测试覆盖 = 测试用例覆盖的边界值数量 / 识别出来的边界值总数；

## 语法测试\(Syntax Testing / Grammar-Based Testing\)

### 背景

基于语法的测试主要用来测试那些输入可以使用形式化描述的被测对象；

比如， GUI程序、XML/HTML程序、使用命令行的软件、脚本语言、数据库查询语言和编译器等；

### 用法

#### Feature Set -&gt; Test Condition

语法测试使用形式化描述对被测对象的输入进行建模，并作为测试依据；

语法一般分为三种类型：

* 顺序型 如，input = ABC
* 选择型 如，input =  A \| B \| C
* 迭代型 如，input = \[ABC\]+

语法可以使用文本的方式表示，也可以使用图示的方式表示；

在语法测试中，把整个被测对象输入模型，或者输入模型的一部分作为被测规格；

#### Test Condition -&gt; Test Coverage Item

推导测试覆盖项主要基于两个目标：测试有效语法，测试无效语法；

* 根据语法定义，列出所有有效的语法选项；
  * 选择型语法
    * 使用每个语法选项

       如，input = A \| B \| C，对应A、B、C三个覆盖项；
  * 迭代型语法
    * 无最大数量限制的，使用one letter和more than one letter两类选项； 

      如，input = \[ABC\]+，对应两类测试覆盖项：A、B、C和AA、BB、CC

    * 有最大数量限制的，使用max repetitions和beyond max repetitions两个选项；

      如，input = \[ABC\]{2}， 对应AA、BB、CC和ABC；
* 根据语法定义，生成对应的无效语法选项；
  * 选择型语法
    * 使用非有效列表里面的语法选项

      如，input = A \| B \| C， 则对应D一个覆盖项；

#### Test Coverage Item -&gt; Test Case

1. 确定如何使用测试用例覆盖测试覆盖项：
   * 一条用例覆盖一个覆盖项；
   * 一条用例覆盖多个覆盖项；
2. 选取要进行覆盖的测试覆盖项；
3. 确定测试用例的输入参数；
4. 确定测试用例的预期输出；
5. 重复2~4，直到覆盖所有测试覆盖项；

### 测试覆盖度量

业界尚无测试覆盖度量的计算方法；

## [组合测试设计技术\(Combinatorial Test Design Techniques\)](https://csrc.nist.gov/Projects/automated-combinatorial-testing-for-software/)

### 用途

组合测试常用来发现被测对象某个参数和参数之间存在交互\(共享/互斥\)情况下的缺陷；

由于参数全组合特别多，组合测试设计中的一些方法用来尽可能保证测试效果的同时减少覆盖项；

根据美国国家标准技术研究所的研究，几乎所有的缺陷均可以在N-Wise\(N=6\)下被发现；

![N-Wise&#x4E0E;&#x7F3A;&#x9677;&#x53D1;&#x73B0;&#x6BD4;&#x7387;&#x7684;&#x5173;&#x7CFB;](../../../../.gitbook/assets/image%20%28106%29.png)

组合测试技术常和分类树联用：分类树可视化参数以及参数的取值，组合测试技术负责生成测试覆盖项；

### 用法

#### Feature Set -&gt; Test Condition

被测对象参数表示与测试有关的项，常常是被测对象的输入参数，但不仅限于输入参数；在配置测试中，这个参数可能是OS、浏览器；

被测对象参数可以有各种取值，组合测试技术需要这些取值是有穷的、对于无穷取值的参数，需要应用等价类、边界值等分析方法先把其转换成有穷的参数；

无论采用哪种组合测试设计技术，它们的测试规格推导方法都是一样的：每个参数\(P\)的一个取值\(V\)对应一个测试规格；

#### Test Condition -&gt; Test Coverage Item

* **All Combinations Testing**

  测试覆盖项为 P-V项全组合 的集合；

* **Pair-wise Testing**\(2-wise\) ****测试覆盖项为  PV项成对组合 的集合；
* **Each Choice Testing\(1-wise\)** 测试覆盖项为 PV项 的集合；
* **Base Choice Testing** 测试覆盖项为 除了一个参数选择Base以外的有效值，其他参数均选择Base值的组合 的集合；

#### Test Coverage Item -&gt; Test Case

* **All Combinations Testing**
  1. 选择一个测试覆盖项用测试用例覆盖；
  2. 根据输入值确定预期结果；
  3. 重复步骤1~2，直到覆盖所有测试覆盖项；
* **Pair-wise Testing\(2-wise\)**
  1. 选择一个测试覆盖项\(每对PV取一对尚未覆盖的参数取值\)用测试用例覆盖；
  2. 测试用例中的其他参数任取有效值；
  3. 根据输入值确定预期结果；
  4. 重复步骤1~3，直到覆盖所有测试覆盖项\(一般使用正交法计算所有参数组合\)；
* **Each Choice Testing\(1-wise\)**
  1. 选择一个测试覆盖项\(取一对尚未覆盖PV参数取值\)用测试用例覆盖；
  2. 测试用例中的其他参数任取有效值；
  3. 根据输入值确定预期结果；
  4. 重复1~3，直到覆盖所有测试覆盖项；
* **Base Choice Testing**
  1. 将所有参数取值设置为base，创建base测试用例；
  2. 通过将其中一个参数切换为非base的有效值，创建一条新用例；
  3. 通过输入值确定预期结果；
  4. 重复2~3，直到覆盖所有的项；

### 测试覆盖度量

组合测试覆盖率 = 测试用例所覆盖的全/2-Wise/1-Wise/Base Choice PV组合 / 所有PV项全/2-Wise/1-Wise/Base Choice PV组合

## [判定表测试\(Decision Table Testing\)](https://www.guru99.com/decision-table-testing.html)

### 用途

判定表测试一般用来测试复杂的业务规则；

![&#x5224;&#x5B9A;&#x8868;&#x793A;&#x4F8B;](../../../../.gitbook/assets/image%20%28107%29.png)

### 用法

#### Feature Set -&gt; Test Condition

分析被测对象，梳理因\(Conditions\)果\(Actions\)关系，并以判定表的形式记录下来；

* 每个Condition是等价划分后的输入值，一个取值对应True，一个取值对应False；
* 每个Action一般是被测对象的一个输出或输出组合，一个取值对应True，一个取值对应False；
* Conditions与Actions之间形成一个判定关系；

每个判定关系对应一个测试规格；

#### Test Condition -&gt; Test Coverage Item

因果所形成的判定规对应测试覆盖项；

#### Test Coverage Item -&gt; Test Case

1. 从判定表里面选择一个测试覆盖项，用测试用例进行覆盖；
2. 确认满足输入条件的输入参数，其他参数任取有效值；
3. 根据输入，确定预期结果；
4. 重复步骤1~3，直到达到所需的测试覆盖率；

### 测试覆盖度量

判定表测试覆盖率 = 测试用例所覆盖的判定规则数理 / 所有判定规则数量

## 因果图\(Cause-Effect Graphing\)

### 用途

因果图和判定表类似，只不过用图形来表示Condtions与Actions之间的判定关系；

![](../../../../.gitbook/assets/image%20%28108%29.png)

### 用法

#### Feature Set -&gt; Test Condition

使用因果图的形式表示因与果之间的判定关系：

* 每个因是一对等价划分后的值，一个对应True，一个对应False；
* 每个果是被测对象的一个或者一组输出组合，一个值对应True，一个值对应False；
* 它们之间的判定关系用因果图表示，有Identity/Not/And/Or/Nand/Nor几种；

每个判定关系作为一个测试规格；

#### Test Condition -&gt; Test Coverage Item

因果形成的判定规则对应测试覆盖项；

#### Test Coverage Item -&gt; Test Case

1. 从判定表里面选择一个测试覆盖项，用测试用例进行覆盖；
2. 确认满足输入条件的输入参数，其他参数任取有效值；
3. 根据输入，确定预期结果；
4. 重复步骤1~3，直到达到所需的测试覆盖率；

### 测试覆盖度量

因果图测试覆盖率 = 测试用例所覆盖的判定规则数理 / 所有判定规则数量

## 状态迁移测试\(State Transition Testing\)

### 用途

### 用法

#### Feature Set -&gt; Test Condition

#### Test Condition -&gt; Test Coverage Item

#### Test Coverage Item -&gt; Test Case

### 测试覆盖度量

## 场景测试\(Scenario Testing\)

### 用法

#### Feature Set -&gt; Test Condition

#### Test Condition -&gt; Test Coverage Item

#### Test Coverage Item -&gt; Test Case

### 测试覆盖度量

## 随机测试\(RamdonTesting\)

### 用途

### 用法

#### Feature Set -&gt; Test Condition

#### Test Condition -&gt; Test Coverage Item

#### Test Coverage Item -&gt; Test Case

### 测试覆盖度量

