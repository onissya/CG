from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    PageBreak,
    Paragraph,
    Preformatted,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).parent
OUTPUT = ROOT / "Lab_4.pdf"
FONT = Path(r"C:\Windows\Fonts\arial.ttf")
FONT_BOLD = Path(r"C:\Windows\Fonts\arialbd.ttf")
CODE_FONT = Path(r"C:\Windows\Fonts\consola.ttf")

pdfmetrics.registerFont(TTFont("Arial", str(FONT)))
pdfmetrics.registerFont(TTFont("Arial-Bold", str(FONT_BOLD)))
pdfmetrics.registerFont(TTFont("Consolas", str(CODE_FONT)))

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(
    name="BodyRu",
    parent=styles["BodyText"],
    fontName="Arial",
    fontSize=10.5,
    leading=15,
    spaceAfter=7,
))
styles.add(ParagraphStyle(
    name="HeadingRu",
    parent=styles["Heading2"],
    fontName="Arial-Bold",
    fontSize=15,
    leading=19,
    spaceBefore=10,
    spaceAfter=8,
))
styles.add(ParagraphStyle(
    name="SubHeadingRu",
    parent=styles["Heading3"],
    fontName="Arial-Bold",
    fontSize=12,
    leading=15,
    spaceBefore=7,
    spaceAfter=5,
))
styles.add(ParagraphStyle(
    name="TitleRu",
    parent=styles["Title"],
    fontName="Arial-Bold",
    fontSize=20,
    leading=25,
    alignment=TA_CENTER,
    textColor=colors.HexColor("#6b2d91"),
    spaceAfter=14,
))
styles.add(ParagraphStyle(
    name="SmallRu",
    parent=styles["BodyText"],
    fontName="Arial",
    fontSize=9,
    leading=12,
    textColor=colors.HexColor("#555555"),
))
styles.add(ParagraphStyle(
    name="CodeRu",
    parent=styles["Code"],
    fontName="Consolas",
    fontSize=8.5,
    leading=11,
    leftIndent=8,
    rightIndent=8,
    spaceBefore=4,
    spaceAfter=8,
    backColor=colors.HexColor("#f2f2f2"),
    borderColor=colors.HexColor("#cccccc"),
    borderWidth=0.5,
    borderPadding=6,
))


def p(text: str, style: str = "BodyRu") -> Paragraph:
    return Paragraph(text, styles[style])


def bullets(items: list[str]) -> list[Paragraph]:
    return [p(f"&#8226; {item}") for item in items]


def footer(canvas, document):
    canvas.saveState()
    canvas.setFont("Arial", 8)
    canvas.setFillColor(colors.HexColor("#666666"))
    canvas.drawString(20 * mm, 12 * mm, "Лабораторная работа №4 - алгоритмы отсечения")
    canvas.drawRightString(190 * mm, 12 * mm, f"Страница {document.page}")
    canvas.restoreState()


story = [
    Spacer(1, 18 * mm),
    p("Лабораторная работа №4", "TitleRu"),
    p("Алгоритмы отсечения отрезков и выпуклого многоугольника", "TitleRu"),
    p("Вариант 17", "BodyRu"),
    Spacer(1, 8 * mm),
    p("Цель работы", "HeadingRu"),
    p("Целью лабораторной работы является закрепление теоретического материала и практическое освоение алгоритмов отсечения графических объектов отсекающим прямоугольным окном. В работе реализовано небольшое веб-приложение на TypeScript и Canvas API.") ,
    p("Задачи", "HeadingRu"),
    *bullets([
        "реализовать алгоритм Лианга-Барски для набора отрезков;",
        "реализовать отсечение выпуклого многоугольника алгоритмом Сазерленда-Ходжмана;",
        "показать координатную систему, окно отсечения, исходную и видимую геометрию;",
        "вывести числовой результат отсечения в таблицу;",
        "проверить алгоритмы автоматическими тестами и выполнить production-сборку.",
    ]),
    p("Исходные данные", "HeadingRu"),
    p("Для отрезков вводится несколько строк вида <b>x1 y1 x2 y2</b>. Для многоугольника каждая строка содержит координаты одной вершины <b>x y</b>. Границы прямоугольного окна задаются числами Xmin, Ymin, Xmax, Ymax. В приложении границы окна нормализуются, поэтому их можно вводить в обратном порядке."),
    PageBreak(),
    p("1. Математическая модель", "HeadingRu"),
    p("Работа приложения описывается математической моделью, связывающей исходные координаты, окно отсечения, алгоритм и результат. Отсекающее окно задаётся прямоугольником W, а экранная координатная сетка получается линейным преобразованием математических координат."),
    Preformatted("W = [Xmin, Xmax] x [Ymin, Ymax]\nP(t) = (x1, y1) + t((x2, y2) - (x1, y1)), 0 <= t <= 1\n(u, v) = (u0 + x * scale, v0 - y * scale)", styles["CodeRu"]),
    p("Входом первой части является набор отрезков S = {s1, s2, ..., sn}, где каждый отрезок задаётся двумя точками. Для каждого отрезка функция отсечения возвращает либо пустой результат, либо новую пару точек, принадлежащую окну W. Таким образом, результат первой части имеет вид C(S, W) = {C(s1, W), ..., C(sn, W)}."),
    Preformatted("C(s, W) = empty, если [tEnter, tLeave] = empty\nC(s, W) = {P(t) | tEnter <= t <= tLeave}, иначе", styles["CodeRu"]),
    p("Входом второй части является выпуклый многоугольник P = (A1, A2, ..., Am). Он последовательно пересекается с четырьмя полуплоскостями окна. Если B1, B2, B3, B4 - границы окна, то результат задаётся последовательностью:"),
    Preformatted("P0 = P\nP1 = Clip(P0, B1)\nP2 = Clip(P1, B2)\nP3 = Clip(P2, B3)\nPout = Clip(P3, B4)", styles["CodeRu"]),
    p("Каждый шаг Clip обрабатывает пары соседних вершин и добавляет вершины, находящиеся внутри текущей полуплоскости, а также точки пересечения с её границей. Поэтому математический результат приложения - это список видимых отрезков или упорядоченный список вершин отсечённого многоугольника."),
    PageBreak(),
    p("2. Теоретические сведения", "HeadingRu"),
    p("Отсечение удаляет часть графического объекта, расположенную за пределами заданного окна. В данной работе окно является осесимметричным прямоугольником:") ,
    Preformatted("Xmin <= x <= Xmax\nYmin <= y <= Ymax", styles["CodeRu"]),
    p("Для варианта 17 в первой части используется алгоритм Лианга-Барски. Он задаёт отрезок параметрически:") ,
    Preformatted("P(t) = P1 + t(P2 - P1), 0 <= t <= 1", styles["CodeRu"]),
    p("Для каждой границы окна вычисляется ограничение на параметр t. Пересечение всех ограничений даёт интервал [tEnter, tLeave]. Если tEnter больше tLeave, отрезок полностью невидим. Иначе концы видимой части находятся подстановкой этих параметров в параметрическое уравнение."),
    p("Псевдокод Лианга-Барски", "SubHeadingRu"),
    Preformatted("dx := x2 - x1; dy := y2 - y1\ntEnter := 0; tLeave := 1\np := [-dx, dx, -dy, dy]\nq := [x1-Xmin, Xmax-x1, y1-Ymin, Ymax-y1]\nдля каждой пары (p[i], q[i]):\n    если p[i] = 0 и q[i] < 0: вернуть невидимый отрезок\n    иначе r := q[i] / p[i]\n    если p[i] < 0: tEnter := max(tEnter, r)\n    иначе: tLeave := min(tLeave, r)\n    если tEnter > tLeave: вернуть невидимый отрезок\nвернуть P(tEnter), P(tLeave)", styles["CodeRu"]),
    p("Во второй части применяется алгоритм Сазерленда-Ходжмана. Многоугольник последовательно обрабатывается относительно четырёх границ окна. Для каждой пары соседних вершин рассматриваются четыре случая: обе вершины внутри, выход из окна, вход в окно и обе вершины снаружи. При пересечении границы добавляется точка пересечения."),
    PageBreak(),
    p("3. Примеры сопровождающих вычислений", "HeadingRu"),
    p("Пусть окно отсечения задано координатами Xmin = -5, Ymin = -5, Xmax = 5, Ymax = 5. Для отрезка A(-10, 0), B(10, 0):"),
    Preformatted("dx = 20, dy = 0\np = [-20, 20, 0, 0]\nq = [-5, 15, 5, 5]\nДля левой границы: t = (-5)/(-20) = 0.25\nДля правой границы: t = 15/20 = 0.75\ntEnter = 0.25, tLeave = 0.75\nP(0.25) = (-5, 0), P(0.75) = (5, 0)", styles["CodeRu"]),
    p("Следовательно, видимая часть отрезка имеет координаты (-5, 0) - (5, 0). Для диагонального отрезка A(-8, -8), B(8, 8) получаются tEnter = 0.1875 и tLeave = 0.8125, поэтому видимая часть равна (-5, -5) - (5, 5)."),
    p("Пример отсечения многоугольника", "SubHeadingRu"),
    p("Исходный выпуклый пятиугольник задан вершинами (-8, -3), (8, -3), (10, 8), (0, 12), (-10, 8). После обработки четырёх границ окна остаётся прямоугольная часть с вершинами:"),
    Preformatted("(-5, 5), (-5, -3), (5, -3), (5, 5)", styles["CodeRu"]),
    p("Порядок вершин сохраняется по контуру многоугольника. Если весь многоугольник находится вне окна, алгоритм возвращает пустой список вершин."),
    p("Обработка особых случаев", "SubHeadingRu"),
    *bullets([
        "для вертикальных и горизонтальных отрезков деление на ноль заменяется проверкой параллельности границе;",
        "вырожденный отрезок остаётся точкой, если точка находится внутри окна;",
        "пустой или некорректный ввод не передаётся в алгоритм, а показывается пользователю как ошибка формы;",
        "для многоугольника с менее чем тремя вершинами расчёт не запускается.",
    ]),
    PageBreak(),
    p("4. Структура и реализация приложения", "HeadingRu"),
    p("Проект размещён в отдельной папке Lab_4 и повторяет организацию предыдущих лабораторных работ."),
]

structure = [
    [p("Файл", "SmallRu"), p("Назначение", "SmallRu")],
    [p("src/types.ts", "BodyRu"), p("Типы точки, отрезка, окна и многоугольника.", "BodyRu")],
    [p("src/algorithms.ts", "BodyRu"), p("Чистые реализации Лианга-Барски и Сазерленда-Ходжмана.", "BodyRu")],
    [p("src/algorithms.test.ts", "BodyRu"), p("Проверки видимых, невидимых, вертикальных и вырожденных случаев.", "BodyRu")],
    [p("src/main.ts", "BodyRu"), p("Форма, разбор входных данных, Canvas и таблицы результата.", "BodyRu")],
    [p("src/style.css", "BodyRu"), p("Простое оформление страницы и легенды.", "BodyRu")],
    [p("README.md", "BodyRu"), p("Запуск и описание варианта 17.", "BodyRu")],
    [p("Lab_4.pdf", "BodyRu"), p("Отчёт по лабораторной работе.", "BodyRu")],
]
story.append(Table(structure, colWidths=[55 * mm, 115 * mm], repeatRows=1, style=TableStyle([
    ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#999999")),
    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e8e8e8")),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
])))
story.extend([
    Spacer(1, 6),
    p("Пользовательский интерфейс содержит два режима. В режиме отрезков выводится таблица с исходными отрезками, видимыми частями и параметрами tEnter/tLeave. В режиме многоугольника выводятся исходные и оставшиеся вершины. Canvas рисует систему координат, окно фиолетовым цветом, исходную геометрию оранжевым и видимую часть зелёным."),
    p("Основные фрагменты интерфейса", "SubHeadingRu"),
    Preformatted("const clipped = segments.map((segment) =>\n  clipSegmentLiangBarsky(segment, window));\n\nconst clippedPolygon = clipConvexPolygonSutherlandHodgman(\n  polygon,\n  window,\n);", styles["CodeRu"]),
    PageBreak(),
    p("5. Результат работы", "HeadingRu"),
    p("В результате создано веб-приложение на TypeScript и Canvas API. Оно принимает набор отрезков или вершины выпуклого многоугольника, выполняет выбранное задание варианта 17 и показывает результат на координатной сетке."),
])

result_table = [
    [p("Проверка", "SmallRu"), p("Результат", "SmallRu")],
    [p("Отрезок, пересекающий окно", "BodyRu"), p("Видимая часть вычисляется по параметрам tEnter и tLeave.", "BodyRu")],
    [p("Полностью невидимый отрезок", "BodyRu"), p("Возвращается статус «невидим».", "BodyRu")],
    [p("Вертикальный отрезок", "BodyRu"), p("Границы по Y вычисляются без деления на ноль.", "BodyRu")],
    [p("Выпуклый многоугольник", "BodyRu"), p("Оставляются только вершины внутри окна и точки пересечения границ.", "BodyRu")],
    [p("Пустой/ошибочный ввод", "BodyRu"), p("Пользователь получает сообщение об ошибке формы.", "BodyRu")],
]
story.append(Table(result_table, colWidths=[65 * mm, 105 * mm], repeatRows=1, style=TableStyle([
    ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#999999")),
    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e8e8e8")),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
])))
story.extend([
    Spacer(1, 8),
    p("Проверка проекта", "SubHeadingRu"),
    Preformatted("pnpm test\n7 tests passed\n\npnpm run build\n✓ built for production", styles["CodeRu"]),
    p("Визуальная проверка в браузере подтвердила работу обоих режимов: для тестового набора из четырёх отрезков видимыми оказались три, а для тестового пятиугольника после отсечения осталось четыре вершины. Canvas, координатная сетка, легенда и таблицы результата отображаются корректно."),
    PageBreak(),
    p("Вывод", "HeadingRu"),
    p("В ходе лабораторной работы изучены и реализованы два алгоритма отсечения. Алгоритм Лианга-Барски работает с параметрическим представлением отрезка и позволяет быстро найти интервал его видимости внутри прямоугольного окна. Алгоритм Сазерленда-Ходжмана последовательно обрабатывает границы окна и строит новый выпуклый многоугольник по точкам входа и выхода."),
    p("Поставленные задачи выполнены. Разработанное веб-приложение наглядно показывает исходную геометрию и результат отсечения, выводит координаты и параметры вычислений, обрабатывает особые случаи и сопровождается автоматическими тестами."),
])

document = SimpleDocTemplate(
    str(OUTPUT),
    pagesize=A4,
    rightMargin=20 * mm,
    leftMargin=20 * mm,
    topMargin=17 * mm,
    bottomMargin=20 * mm,
    title="Лабораторная работа №4 - алгоритмы отсечения",
    author="Студент",
)
document.build(story, onFirstPage=footer, onLaterPages=footer)
print(OUTPUT)
