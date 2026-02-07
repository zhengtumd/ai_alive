"""
测试报告生成器
==============

生成多种格式的测试报告。

支持的格式:
    - JSON: 详细数据报告
    - HTML: 可视化报告
    - Markdown: 简洁文本报告
    - Console: 控制台输出
"""

import json
from datetime import datetime
from pathlib import Path
from typing import List, Optional
from .base import TestResult


class TestReporter:
    """测试报告生成器"""
    
    def __init__(self, output_dir: str = "tests/reports"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
    def generate_report(
        self, 
        results: List[TestResult], 
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        formats: List[str] = None
    ) -> dict:
        """
        生成测试报告
        
        Args:
            results: 测试结果列表
            start_time: 测试开始时间
            end_time: 测试结束时间
            formats: 报告格式列表 ["json", "html", "markdown"]
            
        Returns:
            生成的报告文件路径字典
        """
        if formats is None:
            formats = ["json", "markdown"]
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        generated_files = {}
        
        # 计算统计数据
        stats = self._calculate_stats(results, start_time, end_time)
        
        if "json" in formats:
            json_path = self._generate_json(results, stats, timestamp)
            generated_files["json"] = str(json_path)
            
        if "html" in formats:
            html_path = self._generate_html(results, stats, timestamp)
            generated_files["html"] = str(html_path)
            
        if "markdown" in formats:
            md_path = self._generate_markdown(results, stats, timestamp)
            generated_files["markdown"] = str(md_path)
        
        return generated_files
    
    def _calculate_stats(
        self, 
        results: List[TestResult],
        start_time: Optional[datetime],
        end_time: Optional[datetime]
    ) -> dict:
        """计算统计数据"""
        total = len(results)
        passed = sum(1 for r in results if r.success)
        failed = total - passed
        
        duration = 0.0
        if start_time and end_time:
            duration = (end_time - start_time).total_seconds()
        
        total_test_duration = sum(r.duration for r in results)
        
        return {
            "total": total,
            "passed": passed,
            "failed": failed,
            "pass_rate": passed / total * 100 if total > 0 else 0,
            "duration": duration,
            "total_test_duration": total_test_duration,
            "timestamp": datetime.now().isoformat()
        }
    
    def _generate_json(self, results: List[TestResult], stats: dict, timestamp: str) -> Path:
        """生成 JSON 报告"""
        report = {
            "stats": stats,
            "results": [
                {
                    "name": r.name,
                    "success": r.success,
                    "duration": r.duration,
                    "error": r.error,
                    "timestamp": r.timestamp
                }
                for r in results
            ]
        }
        
        filepath = self.output_dir / f"report_{timestamp}.json"
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        print(f"JSON 报告: {filepath}")
        return filepath
    
    def _generate_markdown(self, results: List[TestResult], stats: dict, timestamp: str) -> Path:
        """生成 Markdown 报告"""
        lines = [
            "# 测试报告",
            "",
            f"生成时间: {stats['timestamp']}",
            "",
            "## 统计",
            "",
            f"- 总测试数: {stats['total']}",
            f"- 通过: {stats['passed']} ✅",
            f"- 失败: {stats['failed']} ❌",
            f"- 通过率: {stats['pass_rate']:.1f}%",
            f"- 总耗时: {stats['duration']:.2f}秒",
            "",
            "## 详细结果",
            "",
            "| 测试名称 | 状态 | 耗时 | 错误 |",
            "|---------|------|------|------|",
        ]
        
        for r in results:
            status = "✅ 通过" if r.success else "❌ 失败"
            error = r.error if r.error else "-"
            lines.append(f"| {r.name} | {status} | {r.duration:.3f}s | {error} |")
        
        lines.extend([
            "",
            "## 失败详情",
            ""
        ])
        
        failed_tests = [r for r in results if not r.success]
        if failed_tests:
            for r in failed_tests:
                lines.extend([
                    f"### {r.name}",
                    "",
                    f"**错误**: {r.error}",
                    ""
                ])
        else:
            lines.append("所有测试通过！🎉")
        
        filepath = self.output_dir / f"report_{timestamp}.md"
        with open(filepath, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))
        
        print(f"Markdown 报告: {filepath}")
        return filepath
    
    def _generate_html(self, results: List[TestResult], stats: dict, timestamp: str) -> Path:
        """生成 HTML 报告"""
        # 简单的 HTML 模板
        html_template = """<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>测试报告</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        h1 { color: #333; }
        .stats { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .stat-item { margin: 10px 0; }
        .pass { color: green; }
        .fail { color: red; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #4CAF50; color: white; }
        tr:hover { background-color: #f5f5f5; }
        .success-row { background-color: #e8f5e9; }
        .fail-row { background-color: #ffebee; }
    </style>
</head>
<body>
    <h1>🧪 测试报告</h1>
    <p>生成时间: {timestamp}</p>
    
    <div class="stats">
        <h2>统计</h2>
        <div class="stat-item">总测试数: <strong>{total}</strong></div>
        <div class="stat-item pass">通过: <strong>{passed}</strong> ✅</div>
        <div class="stat-item fail">失败: <strong>{failed}</strong> ❌</div>
        <div class="stat-item">通过率: <strong>{pass_rate:.1f}%</strong></div>
        <div class="stat-item">总耗时: <strong>{duration:.2f}秒</strong></div>
    </div>
    
    <h2>详细结果</h2>
    <table>
        <tr>
            <th>测试名称</th>
            <th>状态</th>
            <th>耗时</th>
            <th>错误</th>
        </tr>
        {rows}
    </table>
</body>
</html>"""
        
        # 生成表格行
        rows = []
        for r in results:
            row_class = "success-row" if r.success else "fail-row"
            status = "✅ 通过" if r.success else "❌ 失败"
            error = r.error if r.error else "-"
            rows.append(
                f'<tr class="{row_class}">'
                f'<td>{r.name}</td>'
                f'<td>{status}</td>'
                f'<td>{r.duration:.3f}s</td>'
                f'<td>{error}</td>'
                f'</tr>'
            )
        
        html = html_template.format(
            timestamp=stats['timestamp'],
            total=stats['total'],
            passed=stats['passed'],
            failed=stats['failed'],
            pass_rate=stats['pass_rate'],
            duration=stats['duration'],
            rows='\n'.join(rows)
        )
        
        filepath = self.output_dir / f"report_{timestamp}.html"
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(html)
        
        print(f"HTML 报告: {filepath}")
        return filepath
