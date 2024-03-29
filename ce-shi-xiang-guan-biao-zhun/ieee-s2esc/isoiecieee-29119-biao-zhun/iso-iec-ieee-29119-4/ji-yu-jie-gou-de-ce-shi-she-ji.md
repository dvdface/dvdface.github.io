# 基于结构的测试设计

## 语句测试(Statement Testing)

### 背景

对可执行语句进行覆盖；

![Demo of Statement Testing](<../../../../.gitbook/assets/image (110).png>)

### 用法

#### Feature Set -> Test Condition

代码里面的每一条可执行语句都作为测试规格；

#### Test Condition -> Test Coverage Item

每个测试规格直接作为测试覆盖项；

#### Test Coverage Item -> Test Case

1. 编写测试用例，覆盖一个或多个尚未覆盖的测试覆盖项;
2. 确定测试用例的输入参数，确保用例执行时控制流会被执行到；
3. 确定测试用例的预期结果；
4. 重复步骤1\~3，直到覆盖所有测试覆盖项；

### 测试覆盖度量

语句测试覆盖率 = 测试用例覆盖的可执行语句 / 被测对象所有可执行语句；

## 分支测试(Branch Testing)

### 背景

对代码分支进行覆盖；

![Demo of Branch Testing](<../../../../.gitbook/assets/image (111).png>)

### 用法

#### Feature Set -> Test Condition

为被测对象建立控制流模型，控制流模型中的每个控制流分支作为测试规格；

分支有：

* 从一个节点到另外一个节点的有条件控制转移；
* 从一个节点到另外一个节点的无条件控制转移；
* 当被测对象有多个入口点时，向入口点的控制转移；

注意事项：

* 100%的分支测试覆盖需要对控制流模型中的所有边进行覆盖；
* 分支测试既要测试无条件转移的控制流(Entry/Exit Point)，也要测试有条件转移的控制流(if/switch)；
* 语句中的函数调用不算做单独的控制流；

#### Test Condition -> Test Coverage Item

每条控制流分支都作为一个测试覆盖项；

#### Test Coverage Item -> Test Case

1. 编写测试用例，覆盖一个或多个尚未覆盖的测试覆盖项;
2. 确定测试用例的输入参数，确保用例执行时控制流会被执行到；
3. 确定测试用例的预期结果；
4. 重复步骤1\~3，直到覆盖所有测试覆盖项；

### 测试覆盖度量

分支测试覆盖率 = 测试用例覆盖的控制流分支数量 / 所有控制流分支数量；

## 判定测试(Decision Testing)

### 背景

对判定点进行覆盖；

![Demo of Decision Testing](<../../../../.gitbook/assets/image (112).png>)

### 用法

#### Feature Set -> Test Condition

为被测对象建立控制流模型，控制流模型中的每个判定点作为测试规格；

比较典型的决策点有：

* if-then-else
* while-loop、for-loop
* switch-case

#### Test Condition -> Test Coverage Item

决策点每个后续控制流分支都是一个测试覆盖项；

#### Test Coverage Item -> Test Case

1. 新建测试用例，覆盖一个或多个尚未覆盖的测试覆盖项；
2. 确定测试用例的输入参数，确保控制流分支会被执行到；
3. 确定测试用例的预期结果；
4. 重复步骤1\~3，直到覆盖所有测试覆盖项；

### 测试覆盖度量

判定测试覆盖率 = 测试用例覆盖的判定点后的控制流数量 / 所有判定点后的控制流总数

## 分支条件测试(Branch Condition Testing)

### 背景

对判定点中的条件和分支进行覆盖；

### 用法

#### Feature Set -> Test Condition

Test Condition的推导和Decision Testing没有什么区别；

为被测对象建立控制流模型，控制流模型中的每个判定点作为测试规格；

比较典型的决策点有：

* if-then-else
* while-loop、for-loop
* switch-case

#### Test Condition -> Test Coverage Item

决策点中的所有Bool判定条件和决策点后的控制流分支作为测试覆盖项；

如，决策点为 A | ( B & C)，要覆盖的测试覆盖项有：

* 判定条件
  * A = True
  * A = False
  * B = True
  * B = False
  * C = True
  * C = False
  * A | ( B & C ) = True
  * A | ( B & C ) = False
* 控制流分支
  * A | (B\&C) 为True时执行的分支
  * A | (B\&C) 为False时执行的分支

#### Test Coverage Item -> Test Case

1. 新建测试用例，覆盖一个或多个尚未覆盖的测试覆盖项；
2. 确定测试用例的输入参数；
3. 确定测试用例输入参数的子集，可以覆盖到条件的Bool取值；
4. 确定测试用例预期输出结果；
5. 重复步骤1\~4，直到达到所要求的测试覆盖率；

### 测试覆盖度量

分支条件测试覆盖率 = 测试用例覆盖的 (条件数 + 决策点后的控制流分支数) /  (条件总数 + 决策点后的控制流分支总数)

## 分支条件组合测试(Branch Condition Combination Testing)

### 背景

对其中的分支条件组合进行覆盖；

### 用法

#### Feature Set -> Test Condition

为被测对象建立控制流模型，控制流模型中的每个判定点作为测试规格；

如，把决策点为 A | ( B & C)作为测试规格；

#### Test Condition -> Test Coverage Item

把决策点中的条件组合作为测试覆盖项；

如，决策点为 A | ( B & C)，要覆盖的测试覆盖项有：

* A=T， B=T， C=T
* A=T， B=T， C=F
* A=T， B=F， C=T
* A=T， B=F， C=F

&#x20;   ...

#### Test Coverage Item -> Test Case

1. 新建一条测试用例，覆盖一个或多个尚未覆盖的测试覆盖项；
2. 确定测试用例的输入参数，确保控制流分支会被执行到；
3. 确定测试用例预期输出结果；
4. 重复步骤1\~3，确保所有的测试覆盖项被覆盖到；

### 测试覆盖度量

分支条件组合测试覆盖率 = 测试用例覆盖的分支条件组合数量 / 分支条件组合总数；

## 修改条件判定覆盖测试(Modified Condition Decision Coverage Testing)

### 背景

减少分支条件、分支条件组合测试的组合项；

### 用法

#### Feature Set -> Test Condition

为被测对象建立控制流模型，控制流模型中的每个判定点作为测试规格；

如，把决策点为 A | ( B & C)作为测试规格；

#### Test Condition -> Test Coverage Item

把决策点中单个条件可以独立影响判定的条件组合作为测试覆盖项；

如，决策点为 A | ( B & C)，要覆盖的测试覆盖项有：

* A=T， B=F， C=F， Outcome=T
* A=F， B=F， C=F， Outcome=F
* A=F， B=T， C=T， Outcome=T
* A=F， B=F， C=T， Outcome=F
* A=F， B=T， C=T， Outcome=T
* A=F， B=T， C=F， Outcome=F

#### Test Coverage Item -> Test Case

1. 新建一条测试用例，覆盖一个或多个尚未覆盖的测试覆盖项；
2. 确定测试用例的输入参数，确保控制流分支会被执行到；
3. 确定测试用例预期输出结果；
4. 重复步骤1\~3，确保所有的测试覆盖项被覆盖到；

### 测试覆盖度量

修改条件判定覆盖率 = 测试用例覆盖的测试覆盖项数量 / 测试覆盖项总数

## 数据流测试(Data Flow Testing)

### 背景

数据流测试主要是通过变量的定义和使用找控制流进行测试；

它主要用来发现以下问题：

* 没有定义变量，就进行使用；
* 定义了变量，但是没有使用；
* 使用变量前，定义了多次；
* 使用变量前，释放了变量；

由于比较耗时，基本不再使用此测试设计方法，改用代码静态扫描工具替代；

### **用法**

#### Feature Set -> Test Condition

在数据流测试中，对变量有如下定义：

* definition，为变量赋值；
* use，不给变量赋值的方式使用变量：
  * p-uses，在判断语句(if/for/while/switch)里面使用变量；
  * c-uses，变量参与表达式计算；

测试规格是那些定义变量并使用变量的控制流路径，即，definition-use pair，这个definition-use路径中不可再对变量进行赋值；

#### Test Condition -> Test Coverage Item

* all definitions testing\
  测试覆盖项是每个变量的definition-use(p-use或c-use)的控制流路径；\
  强调覆盖所有definition，其中，use有为之配对的就行；
* all-c-uses testing\
  测试覆盖项是每个变量的definition-use(c-use)的控制流路径；\
  强调覆盖所有c-use，其中，definition有为之配对的就行；
* all-p-uses testing\
  测试覆盖项是每个变量的definition-use(p-use)的控制流路径；\
  强调覆盖所有p-use，其中，definition有为之配对的就行；
* all-uses testing\
  测试覆盖项是每个变量的definition-use(p-use和c-use)的控制流路径；\
  强调覆盖所有p-use和c-use，其中，definition有为之配对的就行；
* all-du-paths testing \
  测试覆盖项是每个变量所有definition-use(p-use和c-use)组合的控制流路径；

#### Test Coverage Item -> Test Case

1. 选择一条尚未覆盖的definition-use pair控制流进行覆盖；
2. 确定测试用例的输入参数，确保执行时，能覆盖到该控制流；
3. 确定测试用例的预期结果；
4. 重复步骤1\~3，直到覆盖所有的测试覆盖项；

### 测试覆盖度量

数据流覆盖率 = 测试用例覆盖的definition-use pair数量 / 需要覆盖的definition-use pair数量总数；

