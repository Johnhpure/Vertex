/**
 * 文件上传组件
 * 支持拖拽和点击选择 JSON 文件上传
 * 使用 SVG 图标替代 emoji
 */

import { useState, useRef, useCallback } from 'react'

interface FileUploadProps {
    /** 上传成功回调 */
    onUpload: (content: Record<string, unknown>) => void
    /** 是否禁用 */
    disabled?: boolean
}

/** SVG - 上传图标 */
function IconUpload() {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
    )
}

/** SVG - 错误图标 */
function IconAlertCircle() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
    )
}

function FileUpload({ onUpload, disabled = false }: FileUploadProps) {
    const [isDragging, setIsDragging] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    /** 处理文件读取和验证 */
    const processFile = useCallback((file: File) => {
        setError(null)

        if (!file.name.endsWith('.json')) {
            setError('请选择 JSON 格式的文件')
            return
        }

        const reader = new FileReader()
        reader.onload = (e) => {
            try {
                const content = JSON.parse(e.target?.result as string)
                if (typeof content !== 'object' || content === null) {
                    setError('文件内容不是有效的 JSON 对象')
                    return
                }
                onUpload(content as Record<string, unknown>)
            } catch {
                setError('文件内容解析失败，请确认是有效的 JSON')
            }
        }
        reader.onerror = () => {
            setError('文件读取失败')
        }
        reader.readAsText(file)
    }, [onUpload])

    /** 拖拽事件处理 */
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (!disabled) setIsDragging(true)
    }, [disabled])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)
    }, [])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)

        if (disabled) return

        const file = e.dataTransfer.files[0]
        if (file) processFile(file)
    }, [disabled, processFile])

    /** 点击选择文件 */
    const handleClick = () => {
        if (!disabled) fileInputRef.current?.click()
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) processFile(file)
        // 重置 input 值，允许重复选择同一文件
        e.target.value = ''
    }

    return (
        <div className="file-upload-wrapper">
            <div
                className={`file-upload-zone ${isDragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleClick}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick() }}
            >
                <div className="file-upload-icon"><IconUpload /></div>
                <p className="file-upload-text">
                    拖拽 JSON 文件到此处，或<span className="file-upload-link">点击选择</span>
                </p>
                <p className="file-upload-hint">支持 Google Cloud 服务账号 JSON 密钥文件</p>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                />
            </div>
            {error && (
                <p className="file-upload-error">
                    <IconAlertCircle /> {error}
                </p>
            )}
        </div>
    )
}

export default FileUpload
