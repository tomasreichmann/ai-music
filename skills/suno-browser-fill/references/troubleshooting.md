# Suno Browser Fill Troubleshooting

## Common failures

### Chrome debug endpoint is empty

- Relaunch Chrome with remote debugging enabled.
- Use a dedicated profile so the debug session is predictable.

```powershell
$chrome = "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe"
if (-not (Test-Path $chrome)) { $chrome = "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe" }
& $chrome --remote-debugging-port=9222 --user-data-dir="$env:TEMP\codex-chrome"
```

### Wrong tab was selected

- Pass a tighter tab query, for example:

```powershell
python -m ai_music.cli suno fill-browser --fragments <path> --tab-query "suno.com/create"
```

### Some fields were not filled

- Suno likely changed its DOM or the page has not fully rendered yet.
- Refresh the page, wait for the Create form to finish loading, then run the command again.
- Check `missing_fields` in `outputs/reports/suno_browser_fill_report.json`.

### The form filled but the values did not stick

- Suno sometimes hydrates the form after initial render. Re-run the command once the tab is fully stable.
- If a single field keeps failing, try filling without `--submit`, confirm the page state manually, then retry.
