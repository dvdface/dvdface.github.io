# Robot Framework

快速入门

[https://github.com/robotframework/QuickStartGuide/blob/master/QuickStart.rst](https://github.com/robotframework/QuickStartGuide/blob/master/QuickStart.rst)

用户手册

[http://robotframework.org/robotframework/latest/RobotFrameworkUserGuide.html](http://robotframework.org/robotframework/latest/RobotFrameworkUserGuide.html)

## Robot Framework

Robot Framework是一个开源的自动化测试框架, 用于准入测试, 准入驱动测试和机器流程自动化.

> Robot Framework is a generic open source automation framework for acceptance testing, acceptance test-driven development \(ATDD\) and robotic process automation \(RPA\).

语法简单, 容易使用. 底层采用的是关键字驱动方法.

> It has simple, easy-to-use syntax that utilizes the keyword-driven automation approach.

扩展库中的关键字使用Python或者Java实现

> Keywords adding new capabilities are implemented in libraries using either Python or Java.

使用Robot Framework的语法可以创建新的关键字

> New higher level keywords can also be created using Robot Framework's own syntax.

#### 为何要使用Robot Framework

用例形式统一, 执行结果易分析;

关键字可重用/可自定义;

支持数据驱动测试;

支持各种测试, 应用和平台无关;

支持tag对测试用例和套分类;

支持测试用例和测试套级别的初始化和清理

* Enables easy-to-use tabular syntax for [creating test cases](http://robotframework.org/robotframework/latest/RobotFrameworkUserGuide.html#creating-test-cases) in a uniform way.
* Provides ability to create reusable [higher-level keywords](http://robotframework.org/robotframework/latest/RobotFrameworkUserGuide.html#creating-user-keywords) from the existing keywords.
* Provides easy-to-read result [reports](http://robotframework.org/robotframework/latest/RobotFrameworkUserGuide.html#report-file) and [logs](http://robotframework.org/robotframework/latest/RobotFrameworkUserGuide.html#log-file) in HTML format.
* Is platform and application independent.
* Provides a simple [library API](http://robotframework.org/robotframework/latest/RobotFrameworkUserGuide.html#creating-test-libraries) for creating customized test libraries which can be implemented natively with either Python or Java.
* Provides a [command line interface](http://robotframework.org/robotframework/latest/RobotFrameworkUserGuide.html#id173) and XML based [output files](http://robotframework.org/robotframework/latest/RobotFrameworkUserGuide.html#output-file) for integration into existing build infrastructure \(continuous integration systems\).
* Provides support for Selenium for web testing, Java GUI testing, running processes, Telnet, SSH, and so on.
* Supports creating [data-driven test cases](http://robotframework.org/robotframework/latest/RobotFrameworkUserGuide.html#data-driven-style).
* Has built-in support for [variables](http://robotframework.org/robotframework/latest/RobotFrameworkUserGuide.html#variables), practical particularly for testing in different environments.
* Provides [tagging](http://robotframework.org/robotframework/latest/RobotFrameworkUserGuide.html#tagging-test-cases) to categorize and [select test cases](http://robotframework.org/robotframework/latest/RobotFrameworkUserGuide.html#selecting-test-cases) to be executed.
* Enables easy integration with source control: [test suites](http://robot-framework.readthedocs.org/en/master/autodoc/robot.running.html#robot.running.model.TestSuite) are just files and directories that can be versioned with the production code.
* Provides [test-case](http://robotframework.org/robotframework/latest/RobotFrameworkUserGuide.html#test-setup-and-teardown) and [test-suite](http://robotframework.org/robotframework/latest/RobotFrameworkUserGuide.html#suite-setup-and-teardown) -level setup and teardown.
* The modular architecture supports creating tests even for applications with several diverse interfaces

#### Robot Framework的架构

![](../../../.gitbook/assets/image%20%28131%29.png)

测试数据以表格的形式存储; 

当Robot框架开始执行的时候, 它处理测试数据, 执行测试用例, 生成日志和报告；

核心框架不知道测试的对象, 它只和底层的关键字库交互. 

测试库可以直接使用API或者底层的测试工具等其他接口.

#### 如何安装?

1. [访问python.org](http://xn--python-oy7ry56d.org/)， 安装python3.x的最新版本
2. pip install -i [https://pypi.tuna.tsinghua.edu.cn/simple](https://pypi.tuna.tsinghua.edu.cn/simple) pip -U
3. pip config set global.index-url [https://pypi.tuna.tsinghua.edu.cn/simple](https://pypi.tuna.tsinghua.edu.cn/simple)
4. pip install robotframework
5. 安装robotframework-ride， ride是robotframework的IDE

   1. 修改c:\windows\system32\drivers\etc\hosts，增加 23.50.38.17 [aka.ms](http://aka.ms/)
   2. 安装Build Tools for Visual Studio

      下载安装器， 启动，选择 使用 C++ 的桌面开发 选项框后，安装

   3. pip install -U [https://github.com/robotframework/RIDE/archive/master.zip](https://github.com/robotframework/RIDE/archive/master.zip)
   4. 修改C:\Program Files\Python39\Lib\site-packages\robotide\preferences\settings.cfg

      show\_message\_log = True

   6-7浏览器自动化需要

6. pip install robotframework-seleniumlibrary
7. 安装浏览器自动化控制的驱动，要放入到PATH路径里面

   [Chrome](https://chromedriver.chromium.org/downloads)， [Edge](https://developer.microsoft.com/zh-cn/microsoft-edge/tools/webdriver/)\(需要重命名为MicrosoftWebDriver.exe\)， [Firefox](https://github.com/mozilla/geckodriver/releases)， [Safari](https://webkit.org/blog/6900/webdriver-support-in-safari-10/)

#### 如何执行?

使用Ride执行， 或者使用命令行执行

* Ride执行

在用例所在目录启动CMD， 切换到用例所在目录， 然后启动RIDE，再到RIDE里面选择用例执行

* 命令行执行

```text
# 一般用
*robot   <数据源>
# 或*
python -m robot
*# 或*
java -jar robotframework.jar [options] data_sources

# 常用执行参数

# 执行哪个测试
--name <要执行的文件或目录>

# 执行哪个用例
--test <测试用例的名字>

# 要执行哪个测试套
--suite <测试套的名字>

# 使用tag执行用例
--include <tag>
--exclude <tag>

# 设置顶层测试的元信息
--metadata name:value  

# 保存测试结果, 一般不用指定, 自动生成
--log <保存到哪个html文件>
```

## Test Data

* 测试用例写在测试文件中
* 一个测试文件对应一个测试套, 这个测试套包含这个文件中的所有用例
* 包含测试文件的目录, 形成更高级别的测试套, 即, 所谓的 test suite directory
* 测试套目录可以相互嵌套
* 测试套目录可以包含一个特殊的初始化文件, 用来配置测试套

### Test Data概述

#### 文件格式类型

文件包含非英文，须以utf8编码保存

使用\_\_init\_\_.robot给测试目录做初始化

用例后缀默认\*\*\*.robot\*\*，执行时_可用\*\*--extension_\*指定其他后缀用例

资源文件后缀默认\*\*\*.resource\*\*\*

文件编写的格式有三种：&lt;空格&gt;分隔， \| 分隔， 和 [\*\*reStructuredText](https://en.wikipedia.org/wiki/ReStructuredText)\*\* 格式， 常用前两种

空格分隔的时候， 空格的数量必须大于等于2

[\*\*reStructuredText](https://en.wikipedia.org/wiki/ReStructuredText)结构, 其后缀一般为\*.rst,\* 同样需要\*--extension\*参数在执行的时候指定\*\*

使用 _**.. code:: &lt;code area name&gt;**_ 指令嵌入Robot的Test Data

使用这种文件格式,主要是先把 文档 + Code 一起管理

```text
reStructuredText example
------------------------

This text is outside code blocks and thus ignored.

.. code:: robotframework

   *** Settings ***
   Documentation    Example using the reStructuredText format.
   Library          OperatingSystem

   *** Variables ***
   ${MESSAGE}       Hello, world!

   *** Test Cases ***
   My Test
       [Documentation]    Example test.
       Log    ${MESSAGE}
       My Keyword    ${CURDIR}

   Another Test
       Should Be Equal    ${MESSAGE}    Hello, world!

Also this text is outside code blocks and ignored. Code blocks not
containing Robot Framework data are ignored as well.

.. code:: robotframework

   # Both space and pipe separated formats are supported.

   | *** Keyword ***  |                        |         |
   | My Keyword       | [Arguments]            | ${path} |
   |                  | Directory Should Exist | ${path} |

.. code:: python

   # This code block is ignored.
   def example():
       print('Hello, world!')
```

#### Test Data Section

不同的区域使用不同的头进行标识, 例如, **Settings**. 文字部分大小不敏感, 但是周边的空格是可选的. 只要有一个就行, 长度随意. 尾部并不一定要成对的 _, 只需要_打头就行.

[Test Data Section](https://www.notion.so/28d04cae83014b26849e9154be880d17)

#### Test Data处理顺序

1. **忽略掉某些数据**

* 首个Test Data区域前的数据不会解析
* 注释里面的不会解析
* 空行里面的不会解析
* 使用\|分隔的时候， 最后的空单元不会解析
* 不用于转义的单个的\符号不会解析
* \#符号为该单元的第一个符号时， 后的所有字符串都不会解析

**2. 完成转义**

[特殊字符的转义](https://www.notion.so/705f4dd4cc8b452dae911cdc57daa1a4)

**3.处理空值**

空格分隔的文件里面空格是作为分隔符使用的， 要输入空值， 要么使用 ‘\ ’, 要么使用${EMPTY}

```text
*** Test Cases ***
Using backslash
    Do Something    first arg    **\\**
    Do Something    **\\**            second arg

Using ${EMPTY}
    Do Something    first arg    **${EMPTY}**
    Do Something    ${EMPTY}     second arg
```

\| 分隔的文件里面， 在尾部的空值才需要特殊处理，否则会被忽略

```text
| *** Test Cases *** |              |           |            |
| Using backslash    | Do Something | first arg | **\\**          |
|                    | Do Something |           | second arg |
|                    |              |           |            |
| Using ${EMPTY}     | Do Something | first arg | **${EMPTY}**   |
|                    | Do Something |           | second arg |
```

4\*\*.将数据分为多行\*\*

如果需要分行， 那么下一行使用...打头即可

```text
*** Settings ***
Documentation      Here we have documentation for this suite.
**...**                Documentation is often quite long.
**...**
**...**                It can also contain multiple paragraphs.
Default Tags       default tag 1    default tag 2    default tag 3
**...**                default tag 4    default tag 5
```

### [变量的定义与使用](http://robotframework.org/robotframework/latest/RobotFrameworkUserGuide.html#variables)

[Untitled](https://www.notion.so/3507d2cfd8f344bca5c45b27fecba6b5)

### [资源文件](http://robotframework.org/robotframework/latest/RobotFrameworkUserGuide.html#resource-and-variable-files)

资源文件用于 用户关键字 和 变量 的重用，后缀名用.resource

[Untitled](https://www.notion.so/b7b155bebc6a451f9f2655ca426e5ced)

### [变量文件](http://robotframework.org/robotframework/latest/RobotFrameworkUserGuide.html#variable-files)

💡变量文件是py文件\(还有其他类型的，略\)，用于动态创建测试用例所需的变量

| 类型 | 说明 | 示例 |
| :--- | :--- | :--- |
| [创建方法](https://www.notion.so/049c4ae623ad4710af48c124b71723cd) | \*用Python模块创建变量 \*用特殊函数创建变量 | _**Python module创建法：直接定义非\_开头的变量**_ VARIABLE = "An example string" ANOTHER\_VARIABLE = "This is pretty easy!" INTEGER = 42 STRINGS = \["one", "two", "kolme", "four"\] NUMBERS = \[1, INTEGER, 3.14\] MAPPING = {"one": 1, "two": 2, "three": 3} **特殊函数创建法：在py文件中实现get\_variables函数，返回包含变量名称，值关系的字典， Robot会调用该函数获取变量** def get\_variables\(\): variables = {"VARIABLE ": "An example string", "ANOTHER VARIABLE": "This is pretty easy!", "INTEGER": 42, "STRINGS": \["one", "two", "kolme", "four"\], "NUMBERS": \[1, 42, 3.14\], "MAPPING": {"one": 1, "two": 2, "three": 3}} return variables |
| [引用变量](https://www.notion.so/230fde4841d44eb4982bd367b38dc5d1) |  | **\*\* Settings \*\*\*** **Variables** [myvariables.py](http://myvariables.py/) **Variables** ../data/variables.py **Variables** ${RESOURCES}/common.py **Variables** taking\_arguments.py arg1 ${ARG2} |

### 用例文件

#### 测试用例风格

| 风格 | 示例 | 说明 |
| :--- | :--- | :--- |
| [Keywrod Driven](https://www.notion.so/Keywrod-Driven-41cc5094d0764e0db2179f7fc9609250) | **\*\* Test Cases \*\*\*** Push button Push button 1 Result should be 1 |  |
| [Data Driven](https://www.notion.so/Data-Driven-7d6ac715716d42a4b556b880ef3e5235) | **\*\* Settings \*\*\*** Test Template Calculate **\*\* Test Cases \*\*\*** Expression Expected Addition 12 + 2 + 2 16 2 + -3 -1 **\*\* Keywords \*\*\*** Calculate **\[Arguments\]** ${expression} ${expected} Push buttons C${expression}= Result should be ${expected} | 定义模板关键字 定义数据驱动的测试用例 |
| [BDD](https://www.notion.so/BDD-7787b4f9ffab400d8d36b186c5b0ebb4) | **\*\* Test Cases \*\*\*** Addition Given calculator has been cleared When user types "1 + 1" and user pushes equals Then result is "2" **\*\*\* Keywords \*\*\*** Calculator has been cleared Push button C User types "${expression}" Push buttons ${expression} User pushes equals Push button = Result is "${result}" Result should be ${result} | 使用Gherkin的语法格式描述用例 实现其中使用的关键字 |

**模板使用方法**

* 在用例里面使用\[Template\]定义模板关键字

  ```text
  *** Test Cases **
  Templated test case
      [Template]    Example keyword  # 模板化的关键字
      first argument    second argument  # 关键字的参数， 参数1  与 参数2

  *** Keywords ***
  Example keyword
  	[Arguments]    ${argument1}    ${argument2}
    Log  ${argument1}
    Log  ${argument2}
  ```

* 在\*\*\*Settings\*\*\*里面定义和使用关键字

  ```text
  *** Settings ***
  # 指定哪个关键字用于模板用例
  Test Template     登录
  Library           SeleniumLibrary


  # 用例的模板化参数
  # 起头要求
  *** Test Cases ***    username       password
  # 用例名             传入参数2   传入参数2
  正常用户名密码        test            test
                       test1           test1
  # 用例名             传入参数2   传入参数2
  用户名为空            ${empty}        test2
  # 用例名             传入参数2   传入参数2
  密码为空              test2           ${empty}
  # 用例名             传入参数2   传入参数2
  用户名和密码均为空     ${empty}        ${empty}

  *** Keywords ***
  # 参数化的关键字
  登录
      [Arguments]    ${username}    ${password}
      Open Browser    https://fty.zobao.net/web/index.html    edge
      Input Text    id:username    ${username}
      Input Text    id:password    ${password}
      Get Element Attribute    id:code    text
      Click Element    id:submit
  ```

**模板使用方法**

* 在用例里面使用\[Template\]定义模板关键字

  ```text
  *** Test Cases **
  Templated test case
      [Template]    Example keyword  # 模板化的关键字
      first argument    second argument  # 关键字的参数， 参数1  与 参数2

  *** Keywords ***
  Example keyword
  	[Arguments]    ${argument1}    ${argument2}
    Log  ${argument1}
    Log  ${argument2}
  ```

* 在\*\*\*Settings\*\*\*里面定义和使用关键字

  ```text
  *** Settings ***
  # 指定哪个关键字用于模板用例
  Test Template     登录
  Library           SeleniumLibrary


  # 用例的模板化参数
  # 起头要求
  *** Test Cases ***    username       password
  # 用例名             传入参数2   传入参数2
  正常用户名密码        test            test
                       test1           test1
  # 用例名             传入参数2   传入参数2
  用户名为空            ${empty}        test2
  # 用例名             传入参数2   传入参数2
  密码为空              test2           ${empty}
  # 用例名             传入参数2   传入参数2
  用户名和密码均为空     ${empty}        ${empty}

  *** Keywords ***
  # 参数化的关键字
  登录
      [Arguments]    ${username}    ${password}
      Open Browser    https://fty.zobao.net/web/index.html    edge
      Input Text    id:username    ${username}
      Input Text    id:password    ${password}
      Get Element Attribute    id:code    text
      Click Element    id:submit
  ```

**模板使用方法**

* 在用例里面使用\[Template\]定义模板关键字

  ```text
  *** Test Cases **
  Templated test case
      [Template]    Example keyword  # 模板化的关键字
      first argument    second argument  # 关键字的参数， 参数1  与 参数2

  *** Keywords ***
  Example keyword
  	[Arguments]    ${argument1}    ${argument2}
    Log  ${argument1}
    Log  ${argument2}
  ```

* 在\*\*\*Settings\*\*\*里面定义和使用关键字

  ```text
  *** Settings ***
  # 指定哪个关键字用于模板用例
  Test Template     登录
  Library           SeleniumLibrary

  # 用例的模板化参数
  # 起头要求
  *** Test Cases ***    username       password
  # 用例名             传入参数2   传入参数2
  正常用户名密码        test            test
                       test1           test1
  # 用例名             传入参数2   传入参数2
  用户名为空            ${empty}        test2
  # 用例名             传入参数2   传入参数2
  密码为空              test2           ${empty}
  # 用例名             传入参数2   传入参数2
  用户名和密码均为空     ${empty}        ${empty}

  *** Keywords ***
  # 参数化的关键字
  登录
      [Arguments]    ${username}    ${password}
      Open Browser    <https://fty.zobao.net/web/index.html>    edge
      Input Text    id:username    ${username}
      Input Text    id:password    ${password}
      Get Element Attribute    id:code    text
      Click Element    id:submit
  ```

#### **用例设置**

| Name | 作用 | 支持Settings里面设置？ |
| :--- | :--- | :--- |
| [\[Documentation\]](https://www.notion.so/Documentation-a93ded337cb0475bb2814bb28a72f81a) | 为测试用例添加描述文字，链接等等 |  |
| [\[Tags\]](https://www.notion.so/Tags-fa93884c48b6400683c4b5648e089aca) | 为测试用例添加Tag | Y |
| [\[Template\]](https://www.notion.so/Template-1225f3c6200f400483d073b55cb24acf) | 把 关键字 指定为 模板 来 实现数据驱动的测试用例 | Y |
| [\[Timeout\]](https://www.notion.so/Timeout-02bd055d33d64d279d68e7cef3f585bb) | 测试用例执行超时时间 | Y |
| [\[Setup\], \[Teardown\]](https://www.notion.so/Setup-Teardown-3884a9c4faf248828906ab59e1d9dbb6) | 为测试用例添加Setup与Teardown | Y |

#### **关键字**

* 参数

| 参数类型 | 如何使用 | 文档中如何辨别 | 如何定义 |
| :--- | :--- | :--- | :--- |
| [位置参数](https://www.notion.so/66288ebbbb6941cfa9c50e412555ec9a) | 按位置传入 | 存在arg1 \| arg2 \| arg3 的参数说明 | ${...}形式定义参数 |
| [默认参数](https://www.notion.so/7455f9fce5df481d8973e43bfcb15d6a) | 不用传入 | 存在name=value形式的参数说明 | ${...}=value形式定义参数 |
| [任意个数参数](https://www.notion.so/f7140bbf88e44091ab7404225ee37530) | 传入任意个数参数 | 参数前面带\*号 | @{...}形式定义参数 |
| [命名参数](https://www.notion.so/78def7ec4ec04bba9cd881bfcc59c7d6) | name=value形式传入 | 存在name=value形式的参数说明 | ${...}=value形式定义参数 |
| [任意参数](https://www.notion.so/eccc08fabff94fef90bb4312d0ef0031) | name=value形式传入 | 参数前面带\*\*号 | &{...}形式定义参数 |

* 返回值

从用户关键字里面返回值

| 返回值的方法 | 示例 |
| :--- | :--- |
| [\[Return\]](https://www.notion.so/Return-bd15da20980b451784767891f5886082) | \*\* Keywords \*\*\* Keyword Return One Value \[Arguments\] ${arg} **\[Return\]** ${value} Keyword Return Two Value \[Arguments\] ${arg} **\[Return\]** ${value1} ${value2} |
| [Return From Keyword](https://www.notion.so/Return-From-Keyword-92306772bd7f4c05a6e6583ecd3f94e9) | 可以在Keyword实现的中间返回值 \*\* Keywords \*\*\* Return One Value \[Arguments\] ${arg} Do Something ${arg} ${value} = Get Some Value **Return From Keyword** ${value} Fail This is not executed |
| [Return From Keyword If](https://www.notion.so/Return-From-Keyword-If-d2ba38f50bde4aa4b14e906c391a8f9c) | 满足条件就返回值，否则不返回 \*\* Keywords \*\*\* Find Index \[Arguments\] ${element} @{items} ${index} = Set Variable ${0} FOR ${item} IN @{items} **Return From Keyword If** '${item}' == '${element}' ${index} ${index} = Set Variable ${index + 1} END **Return From Keyword** ${-1} \# Could also use \[Return\] |

#### 循环语句

| Name | 示例 |
| :--- | :--- |
| [简单循环](https://www.notion.so/b80f0cd2569d4a70ba3e4fbbbdd4a860) | FOR ${i} IN @{list} Log ${i} END |
| [嵌套循环](https://www.notion.so/f43b69e4e1414ddf93a81b1c544d9038) | 不支持 |
| [循环Break](https://www.notion.so/Break-eec1a5cb138f42f0905445e52f83b74c) | FOR ${i} IN @{list} Run Keyword If '${i}' == '1' **Exit For Loop** END |
| [循环Continue](https://www.notion.so/Continue-4bfe613bb53a4314b071be62513f4477) | FOR ${i} IN @{list} **Continue For Loop If** '${i}' == '1' END |
| [多个循环变量](https://www.notion.so/1ffd8184925c490d95ab9e8704fb5866) | FOR ${index{ ${name} ${sex} IN ... 1 dingyi male ... 2 zhangmengxia female ... 3 dingyuzhe male ... 4 zhangyuzhe male Log ${name} Log ${index} Log ${sex} END |
| [Range循环](https://www.notion.so/Range-05c18046895a41edab817123c2f35d1d) | FOR ${index} IN **RANGE** 10 Log ${index} END |
| [枚举循环](https://www.notion.so/c469bf2d2316413fb5efc36b4ff7e2b7) | 列表可以枚举索引值，值\(支持多个\) FOR ${index} ${item} **IN ENUMERATE** @{LIST} Log Many ${index} ${item} END FOR ${index} ${key} ${value} **IN ENUMERATE** &{dict} Log Many ${index} ${key} ${value} END |
| [ZIP循环](https://www.notion.so/ZIP-344680ad935a40aea571fc427f5f97ab) | 注意： 在ZIP后面引用列表的时候，使用$， 而非@ 使用$引用列表，返回 \[ 1, 2, 3 \] 使用@引用列表，一次返回一个元素 \*\* Variables \*\*\* @{NUMBERS} ${1} ${2} ${5} @{NAMES} one two five FOR ${number} ${name} **IN ZIP** ${NUMBERS} ${NAMES} Log Many ${number} ${name} END |
| [单一语句循环](https://www.notion.so/eaac2b7995da4ef484860a82abbbebc4) | **Repeat Keyword** ${times} Keyword2Run ... |

#### 条件语句

| 条件 | 说明 |
| :--- | :--- |
| [Run Keyword If](https://www.notion.so/Run-Keyword-If-49c17303cc664405bc98320e992463fb) | Run Keyword If '${status}' == 'PASS' Log Passed |

### 测试库

#### 测试库的类型

| 类型 | 说明 | 示例 |
| :--- | :--- | :--- |
| [Static API](https://www.notion.so/Static-API-df79a84d95f547d2860acffd1ea01238) | \* 创建Python模块文件或者类，**方法**会自动映射为关键字的名字 \* 库的名字为包含关键字方法的模块名，或者包含关键字的类名 \* 导入模块的方法为 关键字作为模块的方法实现 _**LIBRARY &lt;module\_name&gt;**_ 关键字作为类的方法实现（模块名和类名相同，模块名可以省略\) _**LIBRARY &lt;module\_name&gt;.&lt;class\_name&gt;**_ \* 关键字和方法的匹配规则是去掉\_和空格进行比对 \* 在类中使用ROBOT\_LIBRARY\_SCOPE属性，控制测试库的范围 TEST， 每个测试用例一个实例 SUITE，每个测试套一个实例 GLOBAL， 测试执行期间，仅有一个实例 \* 版本信息使用ROBOT\_LIBRARY\_VERSION属性描述 \* 文档格式使用ROBOT\_LIBRARY\_DOC\_FORMAT指定 ROBOT\(默认\) HTML TEXT reST \* 使用ROBOT\_LIBRARY\_LISTENER属性指定监听测试执行事件的类 \* 关键字是自动识别的，对于不想识别为关键字的类，使用@not\_keyword排除，也可以在类里面将ROBOT\_AUTO\_KEYWORDS属性设置为False关闭 关键字识别关闭后，使用@library @keyword装饰器分别修饰类和方法，进行手动指定\(from robot.api.deco import keyword, library\) \* 关键字可以更名。在类的外部设置变量：原名称.robot\_name = '新名称'，也可以使用@keyword\('新名称', tag=\['tag1', 'tag2'\]\)进行 \* 使用@library装饰器\(from robot.api.deco import library\)，实现以上属性功能 \* 关键字里面输出日志有三种方法 print函数输出，输出字符串首部需要为：\*INFO:&lt;time.time\(\)\*1000&gt;\* logger函数库输出：logging.getLogger\(\).INFO\("..."\) | _**环境变量设置**_ PYTHONPATH=.;%PYTHONPATH% H_**elloLibrary.py**_ def say\_hello\(\): print\("\*INFO helloworld!"\) class HelloLibrary\(\): def \_\_init\_\_\(self, name\): [self.name](http://self.name) = name def sayHello\(self\): print\("\*INFO hello %s!" % self.name\) demo.robot **\*\*\***_**Settings**_**\*\*\*** Library _HelloLibrary_ Library _HelloLibrary.HelloLibrary my name **\*\*\*Test Cases\*\*\*** demo say hello_ |
| [Dynamic API](https://www.notion.so/Dynamic-API-7614f635edb5404eb8cc751401887b99) | 和Static API完全一样，除了get\_keyword\_names\(self\)函数 使用该函数动态返回关键字名称，从而实现动态创建关键字 |  |
| [Hybrid API](https://www.notion.so/Hybrid-API-05f34e4df18841b083418d4455e8e926) | 混合使用Static API和Dynamic API的方法创建测试库 |  |

