import { useState, useEffect, useRef, useCallback } from "react";
import {
    FiCornerUpLeft, FiCornerUpRight, FiBold, FiItalic, FiUnderline,
    FiType, FiAlignLeft, FiAlignCenter, FiAlignRight, FiSearch,
    FiChevronDown, FiPlus, FiShare2, FiDownload, FiUser, FiArrowLeft, FiImage, FiX,
    FiEdit2, FiFilter, FiTrash2, FiScissors, FiCopy, FiColumns, FiAlignJustify, FiArrowUp, FiArrowDown, FiArrowRight, FiList, FiDelete, FiUploadCloud,
    FiMessageSquare, FiSend
} from "react-icons/fi";
import { BsPaintBucket, BsSortAlphaDown, BsSortAlphaDownAlt, BsFilter, BsWhatsapp } from "react-icons/bs";
import { BiStrikethrough, BiArrowToLeft, BiArrowToRight } from "react-icons/bi";
import { TbMathFunction } from "react-icons/tb";
import apiClient from "../api/apiClient";
import { formatCurrency, parseCurrencyInput, SUPPORTED_CURRENCIES, getCurrencySymbol } from "../utils/currencyUtils";
import ShareModal from "../components/ShareModal";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function DocumentEditor({ docName, setActivePath }) {
    const [sheetData, setSheetData] = useState(null);
    const [rows, setRows] = useState([]);
    const [columns, setColumns] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [appliedSearchQuery, setAppliedSearchQuery] = useState('');

    const [newColumnBgColor, setNewColumnBgColor] = useState(null);
    const [newColumnIsRowColorSource, setNewColumnIsRowColorSource] = useState(false);
    const [isRowColorPickerOpen, setIsRowColorPickerOpen] = useState(false);

    const COLOR_PALETTE = [
        { name: 'None', value: null },

        // Reds
        { name: 'Red', value: '#fee2e2' },
        { name: 'Dark Red', value: '#fecaca' },
        { name: 'Rose', value: '#ffe4e6' },

        // Greens
        { name: 'Green', value: '#dcfce7' },
        { name: 'Dark Green', value: '#bbf7d0' },
        { name: 'Mint', value: '#d1fae5' },

        // Blues
        { name: 'Blue', value: '#dbeafe' },
        { name: 'Sky Blue', value: '#e0f2fe' },
        { name: 'Indigo', value: '#e0e7ff' },

        // Yellows
        { name: 'Yellow', value: '#fef9c3' },
        { name: 'Amber', value: '#fef3c7' },
        { name: 'Light Gold', value: '#fef08a' },

        // Oranges
        { name: 'Orange', value: '#ffedd5' },
        { name: 'Peach', value: '#ffe4cc' },
        { name: 'Coral', value: '#ffd6d6' },

        // Purples
        { name: 'Purple', value: '#f3e8ff' },
        { name: 'Lavender', value: '#ede9fe' },
        { name: 'Violet', value: '#e9d5ff' },

        // Pinks
        { name: 'Pink', value: '#fce7f3' },
        { name: 'Light Pink', value: '#fbcfe8' },
        { name: 'Blush', value: '#ffe4e6' },

        // Neutrals
        { name: 'Gray', value: '#f3f4f6' },
        { name: 'Cool Gray', value: '#e5e7eb' },
        { name: 'Warm Gray', value: '#f5f5f4' },
        { name: 'Slate', value: '#e2e8f0' },

        // Extra UI tones
        { name: 'Cyan', value: '#cffafe' },
        { name: 'Teal', value: '#ccfbf1' },
        { name: 'Lime', value: '#ecfccb' },
        { name: 'Emerald', value: '#d1fae5' },
    ];

    useEffect(() => {
        const timer = setTimeout(() => {
            setAppliedSearchQuery(searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Fetch sheet data from API
    const fetchSheetData = useCallback(async () => {
        if (!docName) return; // docName here is actually the sheetId from MyFiles

        setIsLoading(true);
        try {
            const url = appliedSearchQuery ? `/sheets/${docName}/data?search=${encodeURIComponent(appliedSearchQuery)}` : `/sheets/${docName}/data`;
            const response = await apiClient.get(url);
            const data = response.data.data;

            setSheetData(data.sheet);

            // Map columns to include width (defaulting to 220 if not provided by backend)
            const mappedCols = data.columns.map(col => ({
                ...col,
                width: col.width || 220
            }));
            setColumns(mappedCols);

            setRows(data.grid);
        } catch (error) {
            console.error("Error fetching sheet data:", error);
        } finally {
            setIsLoading(false);
        }
    }, [docName, appliedSearchQuery]);

    // Silent refresh — updates rows/columns without showing loading spinner
    const refreshFormulaValues = useCallback(async () => {
        if (!docName) return;
        try {
            const url = appliedSearchQuery ? `/sheets/${docName}/data?search=${encodeURIComponent(appliedSearchQuery)}` : `/sheets/${docName}/data`;
            const response = await apiClient.get(url);
            const data = response.data.data;
            setRows(data.grid);
            // Preserve existing column widths while updating column data
            setColumns(prev => data.columns.map(col => {
                const existing = prev.find(c => c.id === col.id);
                return { ...col, width: existing?.width || col.width || 220 };
            }));
        } catch (error) {
            console.error("Error refreshing formula values:", error);
        }
    }, [docName]);

    // Debounced silent refresh to avoid flooding API on every keystroke
    const refreshTimerRef = useRef(null);
    const debouncedRefreshFormulas = useCallback(() => {
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = setTimeout(() => {
            refreshFormulaValues();
        }, 500);
    }, [refreshFormulaValues]);

    useEffect(() => {
        fetchSheetData();
    }, [fetchSheetData]);

    // Context Menu State
    const [activeColumnMenu, setActiveColumnMenu] = useState(null);
    const menuRef = useRef(null);
    const rowColorPickerRef = useRef(null);

    // Cell Context Menu State
    const [activeCellMenu, setActiveCellMenu] = useState(null);
    const cellMenuRef = useRef(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setActiveColumnMenu(null);
            }
            if (rowColorPickerRef.current && !rowColorPickerRef.current.contains(event.target)) {
                setIsRowColorPickerOpen(false);
            }
            if (cellMenuRef.current && !cellMenuRef.current.contains(event.target)) {
                setActiveCellMenu(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Resizing State
    const [resizingCol, setResizingCol] = useState(null);
    const [startX, setStartX] = useState(0);
    const [startWidth, setStartWidth] = useState(0);

    // Global Mouse Handlers for Resizing
    useEffect(() => {
        if (!resizingCol) return;

        const handleMouseMove = (e) => {
            const diffX = e.clientX - startX;
            const newWidth = Math.max(60, startWidth + diffX); // 60px minimum width
            setColumns(cols => cols.map(c =>
                c.id === resizingCol ? { ...c, width: newWidth } : c
            ));
        };

        const handleMouseUp = () => {
            setResizingCol(null);
            document.body.style.cursor = 'default';
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [resizingCol, startX, startWidth]);

    const handleResizeMouseDown = (e, colId, currentWidth) => {
        e.preventDefault(); // prevent text selection
        setResizingCol(colId);
        setStartX(e.clientX);
        setStartWidth(currentWidth || 220);
        document.body.style.cursor = 'col-resize';
    };

    // Modal State
    const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
    const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
    const [newColumnName, setNewColumnName] = useState('');
    const [newColumnType, setNewColumnType] = useState('text');
    const [newColumnCurrencyCode, setNewColumnCurrencyCode] = useState('INR');

    // Formula Builder State
    const [isFormulaModalOpen, setIsFormulaModalOpen] = useState(false);
    const [formulaString, setFormulaString] = useState('');
    const [pendingFormulaColumnDesc, setPendingFormulaColumnDesc] = useState(null);
    const [editingColId, setEditingColId] = useState(null);

    // Image Gallery Modal State
    const [isImageGalleryOpen, setIsImageGalleryOpen] = useState(false);
    const [activeImageCell, setActiveImageCell] = useState(null); // { rowId, colId, images: [] }
    const [isUploadingImages, setIsUploadingImages] = useState(false);
    const fileInputRef = useRef(null);

    // Calculate Bar State: { [colId]: 'total' | 'average' | null }
    const [columnCalcMode, setColumnCalcMode] = useState({});
    const [activeCalcDropdown, setActiveCalcDropdown] = useState(null);
    const [focusedCell, setFocusedCell] = useState(null);

    // Column Filter State: { [colId]: filterText }
    const [columnFilters, setColumnFilters] = useState({});

    // ── Comment State ─────────────────────────────────────────────────────────
    const [commentCounts, setCommentCounts] = useState({});          // { cellId: count }
    const [commentPanelCell, setCommentPanelCell] = useState(null);  // { cellId, sheetId }
    const [commentsList, setCommentsList] = useState([]);
    const [commentsLoading, setCommentsLoading] = useState(false);
    const [newCommentText, setNewCommentText] = useState('');
    const [editingComment, setEditingComment] = useState(null);       // { id, text }
    const [commentSubmitting, setCommentSubmitting] = useState(false);
    const [hoveredCommentCell, setHoveredCommentCell] = useState(null);
    const [latestCommentPreview, setLatestCommentPreview] = useState(null);

    // Fetch comment counts when sheet loads
    const fetchCommentCounts = useCallback(async () => {
        if (!docName) return;
        try {
            const resp = await apiClient.get(`/sheets/${docName}/comment-counts`);
            setCommentCounts(resp.data.data || {});
        } catch (err) {
            console.error('Error fetching comment counts:', err);
        }
    }, [docName]);

    useEffect(() => {
        if (docName) fetchCommentCounts();
    }, [docName, fetchCommentCounts]);

    // Open comment panel for a cell — upserts cell if it doesn't exist yet
    const openCommentPanel = async (cellId, rowId, columnId) => {
        if (!docName) return;

        let resolvedCellId = cellId;

        // If cell doesn't exist yet (empty cell), create it first
        if (!resolvedCellId && rowId && columnId) {
            try {
                const resp = await apiClient.post(`/sheets/${docName}/cells`, {
                    rowId,
                    columnId,
                    rawValue: ''
                });
                resolvedCellId = resp.data.data?.id;
                // Refresh rows to pick up the new cell id
                await refreshFormulaValues();
            } catch (err) {
                console.error('Error creating cell for comments:', err);
                return;
            }
        }

        if (!resolvedCellId) return;

        setCommentPanelCell({ cellId: resolvedCellId, sheetId: docName });
        setCommentsLoading(true);
        setCommentsList([]);
        setNewCommentText('');
        setEditingComment(null);
        try {
            const resp = await apiClient.get(`/sheets/${docName}/cells/${resolvedCellId}/comments`);
            setCommentsList(resp.data.data || []);
        } catch (err) {
            console.error('Error loading comments:', err);
        } finally {
            setCommentsLoading(false);
        }
    };

    const closeCommentPanel = () => {
        setCommentPanelCell(null);
        setCommentsList([]);
        setNewCommentText('');
        setEditingComment(null);
    };

    const handleAddComment = async () => {
        if (!newCommentText.trim() || !commentPanelCell || commentSubmitting) return;
        setCommentSubmitting(true);
        try {
            const resp = await apiClient.post(
                `/sheets/${commentPanelCell.sheetId}/cells/${commentPanelCell.cellId}/comments`,
                { text: newCommentText.trim() }
            );
            setCommentsList(prev => [...prev, resp.data.data]);
            setNewCommentText('');
            // Increment local comment count
            setCommentCounts(prev => ({
                ...prev,
                [commentPanelCell.cellId]: (prev[commentPanelCell.cellId] || 0) + 1
            }));
        } catch (err) {
            console.error('Error adding comment:', err);
            alert('Failed to add comment. Please try again.');
        } finally {
            setCommentSubmitting(false);
        }
    };

    const handleEditComment = async (commentId) => {
        if (!editingComment || !editingComment.text.trim() || commentSubmitting) return;
        setCommentSubmitting(true);
        try {
            const resp = await apiClient.put(
                `/sheets/${commentPanelCell.sheetId}/cells/${commentPanelCell.cellId}/comments/${commentId}`,
                { text: editingComment.text.trim() }
            );
            setCommentsList(prev => prev.map(c => c.id === commentId ? { ...c, text: resp.data.data.text, updatedAt: resp.data.data.updatedAt } : c));
            setEditingComment(null);
        } catch (err) {
            console.error('Error editing comment:', err);
            alert('Failed to edit comment.');
        } finally {
            setCommentSubmitting(false);
        }
    };

    const handleDeleteComment = async (commentId) => {
        if (commentSubmitting) return;
        setCommentSubmitting(true);
        try {
            await apiClient.delete(
                `/sheets/${commentPanelCell.sheetId}/cells/${commentPanelCell.cellId}/comments/${commentId}`
            );
            setCommentsList(prev => prev.filter(c => c.id !== commentId));
            setCommentCounts(prev => {
                const newCount = Math.max(0, (prev[commentPanelCell.cellId] || 1) - 1);
                if (newCount === 0) {
                    const updated = { ...prev };
                    delete updated[commentPanelCell.cellId];
                    return updated;
                }
                return { ...prev, [commentPanelCell.cellId]: newCount };
            });
        } catch (err) {
            console.error('Error deleting comment:', err);
            alert('Failed to delete comment.');
        } finally {
            setCommentSubmitting(false);
        }
    };

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    // Fetch latest comment for tooltip preview
    const handleCommentHover = async (cellId) => {
        if (!cellId || !docName) return;
        setHoveredCommentCell(cellId);
        try {
            const resp = await apiClient.get(`/sheets/${docName}/cells/${cellId}/comments`);
            const comments = resp.data.data || [];
            if (comments.length > 0) {
                const latest = comments[comments.length - 1];
                setLatestCommentPreview({ cellId, text: latest.text, author: latest.author?.name || 'Unknown' });
            }
        } catch (_) { /* silent */ }
    };

    // Compute filtered rows based on active filters
    const filteredRows = rows.filter(row => {
        return Object.entries(columnFilters).every(([colId, filterText]) => {
            if (!filterText) return true;
            const cell = row.cells?.find(c => c.columnId === colId);
            const val = String(cell?.computedValue ?? cell?.rawValue ?? '').toLowerCase();
            return val.includes(filterText.toLowerCase());
        });
    });

    const getColumnCalcValue = (colId, mode) => {
        const numericValues = rows
            .map(row => {
                const cell = row.cells?.find(c => c.columnId === colId);
                const v = cell?.computedValue ?? cell?.rawValue ?? '';
                return parseFloat(v);
            })
            .filter(n => !isNaN(n));

        if (numericValues.length === 0) return 0;

        const colDef = columns.find(c => c.id === colId);
        let result = null;

        if (mode === 'total') {
            result = numericValues.reduce((sum, n) => sum + n, 0);
        } else if (mode === 'average') {
            result = numericValues.reduce((sum, n) => sum + n, 0) / numericValues.length;
        }

        if (result === null) return null;
        return colDef?.type === 'currency' ? formatCurrency(result, colDef.currencyCode) : (mode === 'average' ? result.toFixed(2) : result);
    };

    const columnTypes = [
        { id: 'text', icon: <span className="text-blue-500 font-serif text-lg">T</span>, name: 'Text', desc: 'Insert alpha numeric values in a cell' },
        { id: 'number', icon: <span className="text-blue-500 font-medium text-sm">123</span>, name: 'Number', desc: 'Insert numbers in a cell' },
        { id: 'date', icon: <span className="text-blue-500 text-lg">📅</span>, name: 'Date', desc: 'Pick or type a date value' },
        { id: 'currency', icon: <span className="text-blue-500 text-lg">₹</span>, name: 'Currency', desc: 'Format number to currency' },
        { id: 'formula', icon: <span className="text-blue-500 italic font-serif text-lg">fx</span>, name: 'Formula', desc: 'Create formula for automatic calculation' },
        { id: 'multi_image', icon: <FiImage className="text-blue-500 w-5 h-5" />, name: 'Image', desc: 'Add multiple images in a cell' },
        { id: 'comment', icon: <FiMessageSquare className="text-blue-500 w-5 h-5" />, name: 'Comments', desc: 'Add comments to a cell' }
    ];

    const handleAddColumnClick = () => {
        setNewColumnName('');
        setNewColumnType('text');
        setEditingColId(null);
        setIsColumnModalOpen(true);
    };

    const handleEditColumnClick = (col) => {
        setNewColumnName(col.name);
        setNewColumnType(col.type);
        setNewColumnCurrencyCode(col.currencyCode || 'INR');
        setNewColumnBgColor(col.bgColor || null);
        const opts = typeof col.options === 'string' ? JSON.parse(col.options) : (col.options || {});
        setNewColumnIsRowColorSource(opts.isRowColorSource || false);
        setEditingColId(col.id);
        setIsColumnModalOpen(true);
        setActiveColumnMenu(null);
    };

    const handleUpdateColumn = async () => {
        if (!newColumnName.trim()) return;

        // If it's a formula, intercept the save to open the formula builder
        if (newColumnType === 'formula') {
            setPendingFormulaColumnDesc({
                name: newColumnName,
                type: newColumnType,
                id: editingColId,
                currencyCode: newColumnCurrencyCode // Save selected currency for formulas
            });
            setIsColumnModalOpen(false);
            setIsFormulaModalOpen(true);
            return;
        }

        await saveColumnToBackend(newColumnName, newColumnType, editingColId, undefined, newColumnBgColor, newColumnIsRowColorSource);
    };

    const saveColumnToBackend = async (name, type, colId, formulaExpr = undefined, bgColor = null, isRowColorSource = false) => {
        try {
            const currencyPayload = type === 'currency' ? { currencyCode: newColumnCurrencyCode } : {};
            const options = { isRowColorSource };

            if (colId) {
                // Update existing column
                await apiClient.put(`/sheets/${docName}/columns/${colId}`, {
                    name,
                    type,
                    bgColor,
                    options,
                    ...currencyPayload,
                    ...(formulaExpr ? { formulaExpr } : {})
                });

                setColumns(cols => cols.map(c =>
                    c.id === colId
                        ? { ...c, name, type, formulaExpr, bgColor, options, ...currencyPayload }
                        : c
                ));

                // Refresh data to get computed formula values
                fetchSheetData();
            } else {
                // Add new column
                const response = await apiClient.post(`/sheets/${docName}/columns`, {
                    name,
                    type,
                    width: 220,
                    bgColor,
                    options,
                    ...currencyPayload,
                    ...(formulaExpr ? { formulaExpr } : {})
                });

                setColumns([...columns, response.data.data]);

                // Refresh data to get correct grid cells
                fetchSheetData();
            }
        } catch (error) {
            console.error("Error saving column:", error);
        }

        setIsColumnModalOpen(false);
        setIsFormulaModalOpen(false);
        setEditingColId(null);
        setPendingFormulaColumnDesc(null);
        setFormulaString('');
    };

    const handleRowColorChange = async (color) => {
        if (!focusedCell) {
            alert("Please select a cell in the row you want to color.");
            return;
        }
        const rowId = focusedCell.rowId;
        try {
            await apiClient.patch(`/sheets/${docName}/rows/${rowId}/color`, { rowColor: color });
            setRows(currentRows => currentRows.map(row =>
                row.id === rowId ? { ...row, rowColor: color } : row
            ));
        } catch (error) {
            console.error("Error updating row color:", error);
        }
        setIsRowColorPickerOpen(false);
    };

    // --- Column Menu Actions ---
    const handleDeleteColumn = async (colId) => {
        try {
            await apiClient.delete(`/sheets/${docName}/columns/${colId}`);
            setColumns(cols => cols.filter(c => c.id !== colId));
            // Clear any filter on the deleted column
            setColumnFilters(prev => {
                const updated = { ...prev };
                delete updated[colId];
                return updated;
            });
            fetchSheetData();
        } catch (error) {
            console.error("Error deleting column:", error);
        }
        setActiveColumnMenu(null);
    };

    const handleAddColumnDirection = async (colId, direction) => {
        const colIndex = columns.findIndex(c => c.id === colId);
        if (colIndex === -1) return;
        setActiveColumnMenu(null);

        try {
            // Use the actual orderIndex from the column, not the array index
            const clickedCol = columns[colIndex];
            const insertIndex = direction === 'left' ? clickedCol.orderIndex : clickedCol.orderIndex + 1;
            // Generate column name like "Column D", "Column E" etc.
            const letter = String.fromCharCode(65 + columns.length); // A=65
            const colName = `Column ${letter}`;

            await apiClient.post(`/sheets/${docName}/columns`, {
                name: colName,
                type: 'text',
                width: 220,
                orderIndex: insertIndex
            });

            // Refresh data to get the new column with correct grid cells
            fetchSheetData();
        } catch (error) {
            console.error("Error adding column:", error);
        }
    };

    const handleSortColumn = (colId, direction) => {
        setRows(currentRows => {
            const sorted = [...currentRows].sort((a, b) => {
                const cellA = a.cells?.find(c => c.columnId === colId);
                const cellB = b.cells?.find(c => c.columnId === colId);
                const valA = cellA?.computedValue ?? cellA?.rawValue ?? '';
                const valB = cellB?.computedValue ?? cellB?.rawValue ?? '';

                // Date comparison for date columns
                const colDef = columns.find(c => c.id === colId);
                if (colDef?.type === 'date') {
                    const dateA = new Date(valA);
                    const dateB = new Date(valB);
                    if (!isNaN(dateA) && !isNaN(dateB)) {
                        return direction === 'asc' ? dateA - dateB : dateB - dateA;
                    }
                }

                // Try numeric comparison first
                const numA = parseFloat(valA);
                const numB = parseFloat(valB);
                if (!isNaN(numA) && !isNaN(numB)) {
                    return direction === 'asc' ? numA - numB : numB - numA;
                }

                // Fallback to string comparison
                const strA = String(valA).toLowerCase();
                const strB = String(valB).toLowerCase();
                if (direction === 'asc') return strA.localeCompare(strB);
                return strB.localeCompare(strA);
            });
            return sorted;
        });
        setActiveColumnMenu(null);
    };

    const handleRenameColumnClick = (colId) => {
        const col = columns.find(c => c.id === colId);
        if (col) {
            handleEditColumnClick(col); // Use the new handler
        }
        setActiveColumnMenu(null);
    };

    const handleFilterColumnClick = (colId) => {
        // Toggle filter: if filter exists, clear it; otherwise, set empty to show input
        setColumnFilters(prev => {
            const updated = { ...prev };
            if (colId in updated) {
                delete updated[colId];
            } else {
                updated[colId] = '';
            }
            return updated;
        });
        setActiveColumnMenu(null);
    };

    const handleSetFormulaClick = (colId) => {
        const col = columns.find(c => c.id === colId);
        if (!col) return;
        setPendingFormulaColumnDesc({
            name: col.name,
            type: 'formula',
            id: col.id
        });
        // Pre-fill formula if one already exists (strip leading '=' for display)
        const existingFormula = col.formulaExpr || '';
        setFormulaString(existingFormula.startsWith('=') ? existingFormula.slice(1) : existingFormula);
        setActiveColumnMenu(null);
        setIsFormulaModalOpen(true);
    };

    // --- Cell Menu Actions ---
    const handleCellContextMenu = (e, rowIndex, colId) => {
        e.preventDefault();
        setActiveCellMenu({
            x: e.clientX,
            y: e.clientY,
            rowIndex,
            colId
        });
        setActiveColumnMenu(null); // Close column menu if open
    };

    const handleCellAction = async (action) => {
        if (!activeCellMenu) return;

        const { rowIndex, colId } = activeCellMenu;
        const row = rows[rowIndex];

        try {
            switch (action) {
                case 'add_row_above':
                case 'add_row_below':
                case 'add_row':
                    await apiClient.post(`/sheets/${docName}/rows`, {});
                    fetchSheetData();
                    break;
                case 'delete_row':
                    if (row && row.id) {
                        await apiClient.delete(`/sheets/${docName}/rows/${row.id}`);
                        fetchSheetData();
                    }
                    break;
                case 'erase_data':
                    if (row && row.id && colId) {
                        await handleCellChange(row.id, colId, "");
                    }
                    break;
                default:
                    console.log(`Cell action: ${action} on row ${rowIndex}, col ${colId}`);
                    break;
            }
        } catch (error) {
            console.error("Error performing cell action:", error);
        }

        setActiveCellMenu(null);
    };

    const handleCellChange = async (rowId, columnId, value) => {
        // Enforce constraints
        const colDef = columns.find(c => c.id === columnId);
        let finalValue = value;
        if (colDef && colDef.type === 'number') {
            if (value !== '' && isNaN(Number(value))) {
                return; // Ignore invalid keystrokes entirely
            }
        } else if (colDef && colDef.type === 'currency') {
            finalValue = parseCurrencyInput(value);
            // For currency, only update local state — save on blur to avoid race conditions
            setRows(currentRows => currentRows.map(row => {
                if (row.id === rowId) {
                    return {
                        ...row,
                        cells: row.cells.map(cell => {
                            if (cell.columnId === columnId) {
                                return { ...cell, rawValue: finalValue, computedValue: finalValue };
                            }
                            return cell;
                        })
                    };
                }
                return row;
            }));
            return; // Don't send to API yet — handleCellBlur will save
        } else if (colDef && colDef.type === 'date') {
            // Allow empty value to clear, validate non-empty
            if (value !== '' && isNaN(new Date(value).getTime())) {
                return; // Reject invalid date
            }
        }

        try {
            // Optimistic update
            setRows(currentRows => currentRows.map(row => {
                if (row.id === rowId) {
                    return {
                        ...row,
                        cells: row.cells.map(cell => {
                            if (cell.columnId === columnId) {
                                return { ...cell, rawValue: value, computedValue: value };
                            }
                            return cell;
                        })
                    };
                }
                return row;
            }));

            // Sync with backend
            await apiClient.post(`/sheets/${docName}/cells`, {
                rowId,
                columnId,
                rawValue: finalValue
            });

            // Re-fetch formula values silently (debounced, no loading spinner)
            const hasFormulaCols = columns.some(c => c.type === 'formula');
            if (hasFormulaCols) {
                debouncedRefreshFormulas();
            }
        } catch (error) {
            console.error("Error saving cell:", error);
        }
    };

    // --- Multi-Image Upload Logic ---
    const handleImageGalleryOpen = (rowId, colId, value) => {
        let parsedImages = [];
        try { if (value) parsedImages = JSON.parse(value); } catch (e) { }
        if (!Array.isArray(parsedImages)) parsedImages = [];
        setActiveImageCell({ rowId, colId, images: parsedImages });
        setIsImageGalleryOpen(true);
    };

    const handleImagesSelected = async (e) => {
        if (!e.target.files?.length) return;
        setIsUploadingImages(true);
        const formData = new FormData();
        Array.from(e.target.files).forEach(f => formData.append("files", f));

        try {
            const resp = await apiClient.post(`/media/upload-multiple`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const uploadedMeta = resp.data.data.map(f => ({
                url: f.fileUrl,
                fileName: f.originalName,
                fileSize: f.sizeBytes,
                mimeType: f.mimeType,
                uploadedAt: f.createdAt || new Date().toISOString()
            }));

            const newImagesList = [...(activeImageCell.images || []), ...uploadedMeta];

            // Update modal state
            setActiveImageCell(prev => ({ ...prev, images: newImagesList }));

            // Save to cell instantly
            await handleCellChange(activeImageCell.rowId, activeImageCell.colId, JSON.stringify(newImagesList));

        } catch (error) {
            console.error("Failed to upload images:", error);
            alert("Upload failed. Validation error or file too large.");
        } finally {
            setIsUploadingImages(false);
            e.target.value = null; // reset file input
        }
    };

    const handleDeleteImage = async (index) => {
        const newImagesList = activeImageCell.images.filter((_, i) => i !== index);
        setActiveImageCell(prev => ({ ...prev, images: newImagesList }));
        await handleCellChange(activeImageCell.rowId, activeImageCell.colId, JSON.stringify(newImagesList));
    };

    const handleCellBlur = async (rowId, columnId, value) => {
        setFocusedCell(null);
        const colDef = columns.find(c => c.id === columnId);
        if (colDef && colDef.type === 'number') {
            if (value === '') {
                handleCellChange(rowId, columnId, '0');
            }
        } else if (colDef && colDef.type === 'currency') {
            // Save currency value to backend on blur (not on every keystroke)
            const finalValue = parseCurrencyInput(value);
            if (finalValue === '') {
                // Default to 0 if empty
                await apiClient.post(`/sheets/${docName}/cells`, { rowId, columnId, rawValue: '0' });
            } else {
                await apiClient.post(`/sheets/${docName}/cells`, { rowId, columnId, rawValue: finalValue });
            }
            // Refresh to get formatted value from backend
            debouncedRefreshFormulas();
        }
    };

    const handleAddRow = async () => {
        try {
            await apiClient.post(`/sheets/${docName}/rows`, {});
            fetchSheetData(); // Refresh to get the new row id
        } catch (error) {
            console.error("Error adding row:", error);
        }
    };

    const handleDownloadBackup = async () => {
        try {
            const res = await apiClient.get(`/sheets/${docName}/export`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            const dateStr = new Date().toISOString().split('T')[0];
            link.setAttribute('download', `spreadsheet_backup_${docName}_${dateStr}.json`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
        } catch (err) {
            console.error("Backup failed", err);
        }
    };

    const handleExportPDF = async () => {
        try {
            setIsLoading(true);
            const doc = new jsPDF('landscape');
            doc.text(`${sheetData?.name || 'Spreadsheet'} - Export`, 14, 15);

            const tableCols = columns.map(c => ({ header: c.name, dataKey: c.id }));

            const tableData = [];
            const imagesToDraw = {};
            const rowBackgrounds = {}; // To store computed row colors for PDF

            const fetchImageAsBase64 = async (url) => {
                try {
                    const response = await fetch(url);
                    const blob = await response.blob();
                    return new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.readAsDataURL(blob);
                    });
                } catch (e) {
                    console.error("Failed to load image", e);
                    return null;
                }
            };

            const hexToRgb = (hex) => {
                if (!hex || hex === 'transparent') return null;
                const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                return result ? [
                    parseInt(result[1], 16),
                    parseInt(result[2], 16),
                    parseInt(result[3], 16)
                ] : null;
            };

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const rowData = {};

                // Determine row background color (same logic as grid rendering)
                let computedRowBg = row.rowColor || null;
                const sourceCol = columns.find(c => {
                    const opts = typeof c.options === 'string' ? JSON.parse(c.options) : (c.options || {});
                    return opts.isRowColorSource && c.bgColor;
                });
                if (sourceCol) {
                    const sourceCell = row.cells?.find(c => c.columnId === sourceCol.id);
                    const val = sourceCell?.computedValue ?? sourceCell?.rawValue;
                    if (val !== null && val !== undefined && val !== '') {
                        computedRowBg = sourceCol.bgColor;
                    }
                }
                rowBackgrounds[i] = computedRowBg;

                for (const col of columns) {
                    const cell = row.cells?.find(c => c.columnId === col.id);
                    let val = cell?.computedValue ?? cell?.rawValue ?? '';

                    if (col.type === 'currency' && val !== '') {
                        val = cell?.formattedValue || formatCurrency(val, col.currencyCode);
                        val = val.replace('₹', 'Rs.');
                    } else if (col.type === 'date') {
                        if (val) {
                            const d = new Date(val + 'T00:00:00');
                            val = isNaN(d.getTime()) ? val : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                        } else {
                            val = 'dd-mm-yyyy';
                        }
                    } else if (col.type === 'comment') {
                        const count = cell?.id ? (commentCounts[cell.id] || 0) : 0;
                        val = count > 0 ? `${count} comment${count > 1 ? 's' : ''}` : 'Tap to add comments.';
                    } else if (col.type === 'multi_image' && val) {
                        try {
                            const imgs = JSON.parse(val);
                            if (Array.isArray(imgs) && imgs.length > 0) {
                                let firstImageUrl = imgs[0].url;
                                if (!firstImageUrl.startsWith('http')) {
                                    firstImageUrl = `${import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:6041'}${firstImageUrl}`;
                                }
                                const base64 = await fetchImageAsBase64(firstImageUrl);
                                if (base64) {
                                    imagesToDraw[`${i}_${col.id}`] = base64;
                                }
                            }
                        } catch (e) { }
                        val = ''; // We will draw the image manually
                    }

                    rowData[col.id] = val;
                }
                tableData.push(rowData);
            }

            autoTable(doc, {
                startY: 20,
                theme: 'grid',
                columns: tableCols,
                body: tableData,
                styles: { 
                    fontSize: 8, 
                    cellPadding: 3, 
                    valign: 'middle', 
                    lineColor: [180, 180, 180], 
                    lineWidth: 0.1,
                    textColor: [51, 65, 85]
                },
                headStyles: { 
                    fillColor: [51, 65, 85], 
                    textColor: 255, 
                    lineColor: [51, 65, 85], 
                    lineWidth: 0.1,
                    fontStyle: 'bold'
                },
                columnStyles: columns.reduce((acc, col) => {
                    if (col.type === 'multi_image') acc[col.id] = { minCellWidth: 25 };
                    if (col.type === 'number' || col.type === 'currency' || col.type === 'formula') {
                        acc[col.id] = { ...acc[col.id], halign: 'right' };
                    }
                    return acc;
                }, {}),
                didParseCell: (data) => {
                    if (data.section === 'body') {
                        const colId = data.column.dataKey;
                        const colDef = columns.find(c => c.id === colId);
                        const rowIndex = data.row.index;
                        
                        // Background color priority: Column Color > Row Color
                        const bgColorHex = colDef?.bgColor || rowBackgrounds[rowIndex];
                        const rgb = hexToRgb(bgColorHex);
                        if (rgb) {
                            data.cell.styles.fillColor = rgb;
                        }

                        if (colDef && colDef.type === 'multi_image') {
                            data.cell.styles.minCellHeight = 20;
                        }
                    }
                },
                didDrawCell: (data) => {
                    if (data.section === 'body') {
                        const imgBase64 = imagesToDraw[`${data.row.index}_${data.column.dataKey}`];
                        if (imgBase64) {
                            const cellWidth = data.cell.width;
                            const cellHeight = data.cell.height;
                            const imgWidth = Math.min(cellWidth - 4, 18);
                            const imgHeight = Math.min(cellHeight - 4, 12);
                            const x = data.cell.x + (cellWidth - imgWidth) / 2;
                            const y = data.cell.y + (cellHeight - imgHeight) / 2;
                            try {
                                doc.addImage(imgBase64, 'JPEG', x, y, imgWidth, imgHeight);
                            } catch (e) {
                                try { doc.addImage(imgBase64, 'PNG', x, y, imgWidth, imgHeight); } catch (e2) { }
                            }
                        }
                    }
                }
            });

            doc.save(`${sheetData?.name || 'spreadsheet'}.pdf`);
        } catch (error) {
            console.error("PDF Export failed:", error);
            alert("Failed to export PDF.");
        } finally {
            setIsLoading(false);
        }
    };

    const renderColumnIcon = (type) => {
        switch (type) {
            case 'image':
            case 'multi_image':
                return <FiImage className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
            case 'number': return <span className="text-green-500 text-sm font-medium shrink-0">123</span>;
            case 'currency': return <span className="text-blue-400 text-sm shrink-0">₹</span>;
            case 'formula': return <span className="text-purple-400 text-sm italic font-serif shrink-0">fx</span>;
            case 'date': return <span className="text-blue-400 text-sm shrink-0">📅</span>;
            case 'comment': return <FiMessageSquare className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
            case 'text':
            default: return <span className="text-blue-400 font-serif text-sm shrink-0">T</span>;
        }
    };

    return (
        <div className="flex flex-col h-screen bg-white overflow-hidden w-full">
            {/* Top Navigation */}
            <div className="bg-[#0f172a] text-white flex items-center justify-between px-4 py-2 shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setActivePath('/my-files')}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors flex items-center justify-center"
                        title="Back to My Files"
                    >
                        <FiArrowLeft className="w-5 h-5 text-gray-300" />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-white shadow-sm">
                            <span className="text-xl leading-none -mt-0.5">D</span>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="font-semibold text-lg">{sheetData?.name || "Loading..."}</h1>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-blue-300 mt-1">
                                <button className="hover:text-blue-100 transition-colors">+ Add Pages</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                    {(sheetData?.userPermission === 'admin') && (
                        <button
                            onClick={() => setIsShareModalOpen(true)}
                            className="flex items-center gap-2 px-3 sm:px-4 py-1.5 bg-white/10 hover:bg-white/20 rounded-full text-sm font-medium transition-colors"
                        >
                            <FiShare2 className="w-4 h-4" />
                            <span className="hidden sm:block">Share</span>
                        </button>
                    )}
                    <button
                        onClick={handleDownloadBackup}
                        className="flex items-center gap-2 px-3 sm:px-4 py-1.5 bg-white/10 hover:bg-white/20 rounded-full text-sm font-medium transition-colors"
                    >
                        <FiDownload className="w-4 h-4" />
                        <span className="hidden sm:block">Backup</span>
                    </button>
                    <button
                        onClick={handleExportPDF}
                        className="flex items-center gap-2 px-3 sm:px-4 py-1.5 bg-white/10 hover:bg-white/20 rounded-full text-sm font-medium transition-colors"
                    >
                        <FiDownload className="w-4 h-4" />
                        <span className="hidden sm:block">Download</span>
                    </button>
                    <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-sm font-semibold ml-2 border border-white/20">
                        J
                    </div>
                </div>
            </div>

            {/* Formatting Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between px-2 py-2 gap-2 sm:gap-0 border-b border-gray-200 bg-white shrink-0">
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide w-full sm:w-auto pb-1 sm:pb-0">
                    {/* Undo/Redo */}
                    <div className="flex items-center px-2 border-r border-gray-200 gap-1">
                        <button className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"><FiCornerUpLeft className="w-4 h-4" /></button>
                        <button className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"><FiCornerUpRight className="w-4 h-4" /></button>
                    </div>

                    {/* Text Formatting */}
                    <div className="flex items-center px-2 border-r border-gray-200 gap-1">
                        <button className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors font-bold"><FiBold className="w-4 h-4" /></button>
                        <button className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors italic"><FiItalic className="w-4 h-4" /></button>
                        <button className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors underline"><FiUnderline className="w-4 h-4" /></button>
                        <button className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"><BiStrikethrough className="w-5 h-5 -mx-0.5" /></button>
                        <div className="flex items-center px-1 group cursor-pointer hover:bg-gray-100 rounded py-1 transition-colors">
                            <FiType className="w-4 h-4 text-gray-600 border-b-2 border-black" />
                            <FiChevronDown className="w-3 h-3 text-gray-400 ml-0.5" />
                        </div>
                        <div className="relative" ref={rowColorPickerRef}>
                            <div 
                                onClick={() => setIsRowColorPickerOpen(!isRowColorPickerOpen)}
                                className="flex items-center px-1 group cursor-pointer hover:bg-gray-100 rounded py-1 transition-colors"
                            >
                                <BsPaintBucket className="w-4 h-4 text-gray-600 border-b-2 border-transparent" />
                                <FiChevronDown className="w-3 h-3 text-gray-400 ml-0.5" />
                            </div>
                            
                            {isRowColorPickerOpen && (
                                <div className="absolute top-full left-0 mt-2 p-3 bg-white rounded-xl shadow-xl border border-gray-100 z-[100] w-48 animate-in fade-in zoom-in-95 duration-100">
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">Row Background</div>
                                    <div className="grid grid-cols-4 gap-2">
                                        {COLOR_PALETTE.map((color) => (
                                            <button
                                                key={`row-color-${color.name}`}
                                                onClick={() => handleRowColorChange(color.value)}
                                                className="w-8 h-8 rounded-lg border border-gray-100 hover:scale-110 transition-transform shadow-sm relative group"
                                                style={{ backgroundColor: color.value || '#fff' }}
                                                title={color.name}
                                            >
                                                {!color.value && <FiX className="w-3 h-3 text-gray-400 mx-auto" />}
                                                <div className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/5 transition-colors" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Alignment */}
                    <div className="flex items-center px-2 border-r border-gray-200 gap-1">
                        <button className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors bg-gray-100"><FiAlignLeft className="w-4 h-4" /></button>
                        <button className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"><FiAlignCenter className="w-4 h-4" /></button>
                        <button className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"><FiAlignRight className="w-4 h-4" /></button>
                    </div>

                    {/* Sort/Filter */}
                    <div className="flex items-center px-2 gap-1">
                        <button className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors flex items-center gap-1">
                            <BsSortAlphaDown className="w-4 h-4" />
                            <FiChevronDown className="w-3 h-3 text-gray-400" />
                        </button>
                        <button className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors text-xl">
                            <BsFilter className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="relative pr-2 sm:pr-4 shrink-0 sm:self-auto self-end w-full sm:w-auto flex items-center">
                    <div className="relative w-full sm:w-72">
                        <input
                            type="text"
                            placeholder="search values..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-4 pr-10 py-1.5 bg-white border border-blue-400 rounded-full text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 w-full text-gray-700 placeholder:text-gray-400"
                        />
                        <div className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center shadow-sm cursor-pointer hover:bg-blue-600 transition-colors">
                            <FiSearch className="w-3.5 h-3.5 text-white" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Spreadsheet Area */}
            <div className="flex-1 overflow-auto bg-gray-50 relative w-full">
                <table className="w-max text-left border-collapse bg-white table-fixed relative">
                    <thead>
                        <tr className="bg-white sticky top-0 z-20 shadow-[0_1px_0_#e5e7eb]">
                            <th className="w-12 min-w-12 border-b border-r border-gray-200 text-center py-2 text-gray-400 font-normal sticky left-0 bg-white z-30"></th>
                            {columns.map(col => (
                                <th
                                    key={col.id}
                                    className="border-b border-r border-gray-200 py-2 px-3 text-xs text-gray-500 font-medium hover:bg-gray-50 transition-colors bg-white relative group select-none"
                                    style={{ width: col.width || 220, minWidth: col.width || 220 }}
                                >
                                    <div
                                        className="flex items-center justify-between"
                                        onClick={() => setActiveColumnMenu(activeColumnMenu === col.id ? null : col.id)}
                                    >
                                        <div className="flex items-center gap-2 overflow-hidden flex-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                            {renderColumnIcon(col.type)}
                                            <span className="truncate block font-medium group-hover:text-blue-600 transition-colors cursor-pointer">{col.name}</span>
                                        </div>
                                        <FiChevronDown className={`w-3.5 h-3.5 shrink-0 ml-2 cursor-pointer transition-transform ${activeColumnMenu === col.id ? 'text-blue-600 rotate-180 opacity-100' : 'text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100'}`} />
                                    </div>

                                    {/* Column Menu Dropdown */}
                                    {activeColumnMenu === col.id && (
                                        <div
                                            ref={menuRef}
                                            className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 text-gray-700 select-none animate-in fade-in zoom-in-95 duration-100"
                                        >
                                            <button
                                                onClick={() => handleRenameColumnClick(col.id)}
                                                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-3 transition-colors"
                                            >
                                                <FiEdit2 className="w-4 h-4 text-gray-400" />
                                                Rename/Edit Column
                                            </button>
                                            <button
                                                onClick={() => handleSortColumn(col.id, 'desc')}
                                                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-3 transition-colors"
                                            >
                                                <BsSortAlphaDownAlt className="w-4 h-4 text-gray-400" />
                                                Sort Descending
                                            </button>
                                            <button
                                                onClick={() => handleSortColumn(col.id, 'asc')}
                                                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-3 transition-colors"
                                            >
                                                <BsSortAlphaDown className="w-4 h-4 text-gray-400" />
                                                Sort Ascending
                                                Sort A-Z
                                            </button>
                                            <button
                                                onClick={() => handleSort(col.id, 'desc')}
                                                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-3 transition-colors"
                                            >
                                                <BsSortAlphaDownAlt className="w-4 h-4 text-gray-400" />
                                                Sort Z-A
                                            </button>
                                            <button
                                                onClick={() => handleFilterColumnClick(col.id)}
                                                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-3 transition-colors"
                                            >
                                                <FiFilter className="w-4 h-4 text-gray-400" />
                                                Filter by value
                                            </button>

                                            {(sheetData?.userPermission === 'admin' || sheetData?.userPermission === 'editor') && (
                                                <>
                                                    <div className="my-1 border-t border-gray-100"></div>
                                                    <button
                                                        onClick={() => handleRenameColumnClick(col.id)}
                                                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-3 transition-colors"
                                                    >
                                                        <FiEdit2 className="w-4 h-4 text-gray-400" />
                                                        Edit Column
                                                    </button>
                                                    <button
                                                        onClick={() => handleSetFormulaClick(col.id)}
                                                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-3 transition-colors"
                                                    >
                                                        <TbMathFunction className="w-4 h-4 text-blue-500" />
                                                        Formula Builder
                                                    </button>
                                                    <div className="my-1 border-t border-gray-100"></div>
                                                    <button
                                                        onClick={() => handleAddColumnDirection(col.id, 'left')}
                                                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-3 transition-colors"
                                                    >
                                                        <BiArrowToLeft className="w-4 h-4 text-gray-400" />
                                                        Add Column to Left
                                                    </button>
                                                    <button
                                                        onClick={() => handleAddColumnDirection(col.id, 'right')}
                                                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-3 transition-colors"
                                                    >
                                                        <BiArrowToRight className="w-4 h-4 text-gray-400" />
                                                        Add Column to Right
                                                    </button>
                                                    <div className="my-1 border-t border-gray-100"></div>
                                                    <button
                                                        onClick={() => handleDeleteColumn(col.id)}
                                                        className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-600 flex items-center gap-3 transition-colors"
                                                    >
                                                        <FiTrash2 className="w-4 h-4 text-red-400" />
                                                        Delete Column
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                    {/* Resize Handle */}
                                    <div
                                        className={`absolute -right-2 top-0 bottom-0 w-4 cursor-col-resize z-20 flex justify-center ${resizingCol === col.id ? 'opacity-100' : 'opacity-0 hover:opacity-100 transition-opacity'}`}
                                        onMouseDown={(e) => handleResizeMouseDown(e, col.id, col.width)}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className={`w-[3px] h-full ${resizingCol === col.id ? 'bg-blue-500' : 'bg-blue-400'}`}></div>
                                    </div>
                                </th>
                            ))}
                            {(sheetData?.userPermission === 'admin' || sheetData?.userPermission === 'editor') && (
                                <th className="w-12 min-w-12 border border-blue-900 bg-[#3b415a] hover:bg-[#2d3144] transition-colors p-0 sticky right-0 z-40 shadow-[-2px_0_5px_rgba(0,0,0,0.1)]">
                                    <button
                                        onClick={handleAddColumnClick}
                                        className="w-full h-full flex items-center justify-center text-white p-2"
                                    >
                                        <FiPlus className="w-5 h-5" />
                                    </button>
                                </th>
                            )}
                        </tr>
                        {/* Filter Row — shown when any column has an active filter */}
                        {Object.keys(columnFilters).length > 0 && (
                            <tr className="bg-blue-50/50 sticky top-[41px] z-20">
                                <th className="w-12 min-w-12 border border-gray-200 bg-blue-50/50 sticky left-0 z-30 text-center">
                                    <FiFilter className="w-3 h-3 text-blue-400 mx-auto" />
                                </th>
                                {columns.map(col => (
                                    <th key={`filter-${col.id}`} className="border border-gray-200 p-1 bg-blue-50/50" style={{ width: col.width || 220, minWidth: col.width || 220 }}>
                                        {col.id in columnFilters ? (
                                            <div className="flex items-center gap-1">
                                                <input
                                                    type="text"
                                                    value={columnFilters[col.id] || ''}
                                                    onChange={(e) => setColumnFilters(prev => ({ ...prev, [col.id]: e.target.value }))}
                                                    placeholder={`Filter ${col.name}...`}
                                                    className="w-full px-2 py-1 text-xs border border-blue-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                                                    autoFocus
                                                />
                                                <button
                                                    onClick={() => setColumnFilters(prev => { const u = { ...prev }; delete u[col.id]; return u; })}
                                                    className="text-gray-400 hover:text-red-500 transition-colors shrink-0"
                                                >
                                                    <FiX className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ) : null}
                                    </th>
                                ))}
                                <th className="w-8 min-w-8 border-b border-gray-200 bg-[#334155] sticky right-0 z-30 relative group cursor-pointer hover:bg-[#1e293b] transition-colors" onClick={() => setIsColumnModalOpen(true)}>
                                    <div className="absolute inset-0 flex items-center justify-center p-0.5 text-white">
                                        <FiPlus className="w-4 h-4" />
                                    </div>
                                </th>
                            </tr>
                        )}
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan={columns.length + 2} className="text-center py-20 text-gray-500">
                                    <div className="flex justify-center items-center h-full">
                                        <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredRows.map((row, index) => {
                                // Determine row background color
                                let computedRowBg = row.rowColor || 'transparent';
                                const sourceCol = columns.find(c => {
                                    const opts = typeof c.options === 'string' ? JSON.parse(c.options) : (c.options || {});
                                    return opts.isRowColorSource && c.bgColor;
                                });
                                if (sourceCol) {
                                    const sourceCell = row.cells?.find(c => c.columnId === sourceCol.id);
                                    const val = sourceCell?.computedValue ?? sourceCell?.rawValue;
                                    if (val !== null && val !== undefined && val !== '') {
                                        computedRowBg = sourceCol.bgColor;
                                    }
                                }

                                return (
                                    <tr
                                        key={row.id || index}
                                        className="hover:bg-blue-50/10 transition-colors group text-[#334155]"
                                        style={{ backgroundColor: computedRowBg }}
                                    >
                                        <td className={`border-b border-r border-gray-200 text-center py-2 text-[13px] text-gray-500 group-hover:bg-gray-100/50 transition-colors w-12 sticky left-0 z-10 min-w-12 font-medium ${computedRowBg === 'transparent' ? 'bg-gray-50/50' : ''}`}>
                                            {row.order !== undefined ? row.order + 1 : index + 1}
                                        </td>
                                        {columns.map((col) => {
                                            const cell = row.cells?.find(c => c.columnId === col.id);
                                            const isFormula = col.type === 'formula';
                                            const val = isFormula
                                                ? (cell?.computedValue ?? '')
                                                : (cell?.computedValue ?? cell?.rawValue ?? '');

                                            const isFocused = focusedCell?.rowId === row.id && focusedCell?.colId === col.id;
                                            let displayVal = val;
                                            if (col.type === 'currency' && val !== '') {
                                                displayVal = isFocused ? val : (cell?.formattedValue || formatCurrency(val, col.currencyCode));
                                            } else if (col.type === 'date' && val) {
                                                const d = new Date(val + 'T00:00:00');
                                                displayVal = isFocused
                                                    ? val
                                                    : (isNaN(d.getTime()) ? val : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }));
                                            }

                                            const cellCommentCount = cell?.id ? (commentCounts[cell.id] || 0) : 0;

                                            return (
                                                <td
                                                    key={col.id}
                                                    className={`border-b border-r border-gray-200 p-0 relative h-9 ${resizingCol === col.id ? 'bg-blue-50/10' : ''} ${activeCellMenu?.rowIndex === index && activeCellMenu?.colId === col.id ? 'ring-2 ring-blue-500 z-10 bg-blue-50/10' : ''}`}
                                                    style={{
                                                        width: col.width || 220,
                                                        minWidth: col.width || 220,
                                                        backgroundColor: col.bgColor || computedRowBg || 'transparent'
                                                    }}
                                                    onContextMenu={(e) => handleCellContextMenu(e, index, col.id)}
                                                >
                                                    {/* Comment Indicator Triangle */}
                                                    {cellCommentCount > 0 && (
                                                        <div
                                                            className="absolute top-0 right-0 z-20 cursor-pointer"
                                                            onClick={(e) => { e.stopPropagation(); openCommentPanel(cell.id, row.id, col.id); }}
                                                            onMouseEnter={() => handleCommentHover(cell.id)}
                                                            onMouseLeave={() => { setHoveredCommentCell(null); setLatestCommentPreview(null); }}
                                                            title={`${cellCommentCount} comment${cellCommentCount > 1 ? 's' : ''}`}
                                                        >
                                                            <div style={{ width: 0, height: 0, borderLeft: '8px solid transparent', borderTop: '8px solid #3b82f6' }} />
                                                            {/* Tooltip preview */}
                                                            {hoveredCommentCell === cell.id && latestCommentPreview?.cellId === cell.id && (
                                                                <div className="absolute top-2 right-2 w-48 bg-gray-800 text-white text-xs rounded-lg p-2 shadow-lg z-50 pointer-events-none">
                                                                    <div className="font-semibold text-blue-300 mb-0.5">{latestCommentPreview.author}</div>
                                                                    <div className="line-clamp-2 opacity-90">{latestCommentPreview.text}</div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                    {col.type === 'currency' && isFocused && (
                                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm select-none pointer-events-none z-20">
                                                            {getCurrencySymbol(col.currencyCode)}
                                                        </div>
                                                    )}
                                                    {col.type === 'comment' ? (
                                                        <div
                                                            className="w-full h-full flex items-center px-2 cursor-pointer hover:bg-blue-50/30 transition-colors"
                                                            onClick={() => openCommentPanel(cell?.id, row.id, col.id)}
                                                        >
                                                            {cellCommentCount > 0 ? (
                                                                <div className="flex items-center gap-2 overflow-hidden w-full">
                                                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                                                                        {cellCommentCount}
                                                                    </div>
                                                                    <span className="text-xs text-gray-600 truncate">
                                                                        {cellCommentCount === 1 ? '1 comment' : `${cellCommentCount} comments`}
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-xs text-blue-400 italic">Tap to add comments.</span>
                                                            )}
                                                        </div>
                                                    ) : col.type === 'multi_image' ? (
                                                        <div
                                                            className="w-full h-full flex items-center px-3 cursor-pointer hover:bg-black/5"
                                                            onClick={() => handleImageGalleryOpen(row.id, col.id, displayVal)}
                                                        >
                                                            {(() => {
                                                                try {
                                                                    const imgs = JSON.parse(displayVal || '[]');
                                                                    if (!Array.isArray(imgs) || imgs.length === 0) {
                                                                        return <span className="text-gray-400 text-xs italic">No Images</span>;
                                                                    }
                                                                    return (
                                                                        <div className="relative inline-flex mt-px">
                                                                            <img
                                                                                src={`${import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:6041'}${imgs[0].url}`}
                                                                                alt="img"
                                                                                className="h-8 w-14 object-cover bg-white rounded border border-gray-200 shrink-0 shadow-sm"
                                                                            />
                                                                            {imgs.length > 1 && (
                                                                                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#374151] text-white flex items-center justify-center text-[9px] font-bold shadow-sm border border-white">
                                                                                    {imgs.length}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                } catch (e) {
                                                                    return <span className="text-red-400 text-xs">Invalid format</span>;
                                                                }
                                                            })()}
                                                        </div>
                                                    ) : col.type === 'date' ? (
                                                        <input
                                                            type="date"
                                                            value={val || ''}
                                                            onChange={(e) => handleCellChange(row.id, col.id, e.target.value)}
                                                            onFocus={() => setFocusedCell({ rowId: row.id, colId: col.id })}
                                                            onBlur={(e) => handleCellBlur(row.id, col.id, e.target.value)}
                                                            readOnly={cell?.permission === 'view'}
                                                            className={`w-full h-full absolute inset-0 px-3 outline-none focus:ring-1 focus:ring-blue-500 focus:z-10 bg-transparent text-[13px] text-gray-800 ${cell?.permission === 'view' ? 'cursor-default' : 'cursor-text'}`}
                                                        />
                                                    ) : (
                                                        <input
                                                            type="text"
                                                            value={displayVal}
                                                            placeholder={col.type === 'number' || col.type === 'currency' ? '0' : ''}
                                                            onChange={(e) => !isFormula && handleCellChange(row.id, col.id, e.target.value)}
                                                            onFocus={() => setFocusedCell({ rowId: row.id, colId: col.id })}
                                                            onBlur={(e) => !isFormula && handleCellBlur(row.id, col.id, e.target.value)}
                                                            readOnly={cell?.permission === 'view' || isFormula}
                                                            className={`w-full h-full absolute inset-0 px-3 outline-none focus:ring-1 focus:ring-blue-500 focus:z-10 bg-transparent text-[13px] text-gray-800 ${col.type === 'currency' && isFocused ? 'pl-8' : ''} ${cell?.permission === 'view' || isFormula ? 'cursor-default bg-gray-50/30' : 'cursor-text'} ${col.type === 'number' || col.type === 'currency' || isFormula ? 'text-right' : ''}`}
                                                        />
                                                    )}
                                                </td>
                                            );
                                        })}
                                        <td className="border-b border-gray-200 w-12 sticky right-0 z-10 min-w-12"></td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                    {(sheetData?.userPermission === 'admin' || sheetData?.userPermission === 'editor') && (
                        <tr className="h-10 hover:bg-gray-50 transition-colors">
                            <td className="w-12 border-b border-gray-200 bg-gray-50 sticky left-0 z-10"></td>
                            <td colSpan={columns.length + 1} className="border-b border-gray-200 p-0">
                                {/* <button
                                    onClick={handleAddRow}
                                    className="w-full h-full flex items-center px-4 gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium group transition-colors"
                                >
                                    <FiPlus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                    Add New Row
                                </button> */}
                            </td>
                        </tr>
                    )}
                </table>

                {/* Bottom Calculation Bar */}
                <div className="flex border-t border-b border-gray-200 bg-[#f8fafc] sticky bottom-0 z-30 shrink-0 w-max h-10">
                    <div
                        onClick={handleAddRow}
                        className="w-12 min-w-12 shrink-0 border-r border-gray-200 bg-[#475569] hover:bg-[#334155] transition-colors flex items-center justify-center cursor-pointer sticky left-0 z-10"
                        title="Add Row"
                    >
                        <FiPlus className="w-4 h-4 text-white" />
                    </div>
                    {columns.map((col) => {
                        const mode = columnCalcMode[col.id];
                        const calcValue = mode ? getColumnCalcValue(col.id, mode) : null;
                        const isNonCalcType = col.type === 'multi_image' || col.type === 'comment' || col.type === 'image';

                        return (
                            <div
                                key={col.id}
                                className={`shrink-0 border-r border-gray-200 bg-[#f8fafc] relative ${resizingCol === col.id ? 'bg-blue-50/20' : ''}`}
                                style={{ width: col.width || 220, minWidth: col.width || 220 }}
                            >
                                {isNonCalcType ? null : mode ? (
                                    /* Show calculated value */
                                    <div className="flex items-center justify-between h-full px-3 py-1.5">
                                        <span className="text-xs text-gray-500 font-medium">
                                            {mode === 'total' ? 'Total' : 'Avg'}:
                                        </span>
                                        <span className="text-sm font-semibold text-gray-800">{calcValue}</span>
                                        <button
                                            onClick={() => setColumnCalcMode(prev => ({ ...prev, [col.id]: null }))}
                                            className="ml-1 text-gray-400 hover:text-gray-600 transition-colors"
                                            title="Clear"
                                        >
                                            <FiX className="w-3 h-3" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="relative h-full flex items-center">
                                        <button
                                            onClick={() => setActiveCalcDropdown(activeCalcDropdown === col.id ? null : col.id)}
                                            className="flex items-center gap-1.5 w-full h-full px-3 text-sm text-[#475569] hover:text-[#3b82f6] hover:bg-blue-50/30 transition-colors outline-none"
                                        >
                                            <span className="font-normal">Calculate</span>
                                            <FiChevronDown className={`w-3 h-3 transition-transform ${activeCalcDropdown === col.id ? 'rotate-180' : ''}`} />
                                        </button>

                                        {activeCalcDropdown === col.id && (
                                            <div className="absolute bottom-full left-0 mb-1 w-36 bg-white rounded shadow-lg border border-gray-200 py-1 z-50">
                                                <button
                                                    onClick={() => {
                                                        setColumnCalcMode(prev => ({ ...prev, [col.id]: 'total' }));
                                                        setActiveCalcDropdown(null);
                                                    }}
                                                    className="w-full text-left px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                                >
                                                    Show Total
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setColumnCalcMode(prev => ({ ...prev, [col.id]: 'average' }));
                                                        setActiveCalcDropdown(null);
                                                    }}
                                                    className="w-full text-left px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                                >
                                                    Show Average
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    <div className="w-12 min-w-12 shrink-0 bg-[#f8fafc] sticky right-0 z-10"></div>
                </div>
            </div>

            {/* Cell Context Menu */}
            {activeCellMenu && (
                <div
                    ref={cellMenuRef}
                    style={{ top: activeCellMenu.y, left: activeCellMenu.x }}
                    className="fixed mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 text-gray-700 select-none animate-in fade-in zoom-in-95 duration-100"
                >
                    <button onClick={() => handleCellAction('cut')} className="w-full text-left px-4 py-1.5 text-sm hover:bg-gray-50 flex items-center gap-3 transition-colors">
                        <FiScissors className="w-4 h-4 text-blue-400" /> Cut
                    </button>
                    <button onClick={() => handleCellAction('copy')} className="w-full text-left px-4 py-1.5 text-sm hover:bg-gray-50 flex items-center gap-3 transition-colors">
                        <FiCopy className="w-4 h-4 text-blue-400" /> Copy
                    </button>
                    <button onClick={() => handleCellAction('copy_column')} className="w-full text-left px-4 py-1.5 text-sm hover:bg-gray-50 flex items-center gap-3 transition-colors">
                        <FiColumns className="w-4 h-4 text-blue-400" /> Copy Column
                    </button>
                    <button onClick={() => handleCellAction('copy_row')} className="w-full text-left px-4 py-1.5 text-sm hover:bg-gray-50 flex items-center gap-3 transition-colors">
                        <FiCopy className="w-4 h-4 text-blue-400" /> Copy Row
                    </button>
                    <button onClick={() => handleCellAction('add_row_above')} className="w-full text-left px-4 py-1.5 text-sm hover:bg-gray-50 flex items-center gap-3 transition-colors">
                        <FiPlus className="w-4 h-4 text-blue-400" /> Add Row Above
                    </button>
                    <button onClick={() => handleCellAction('add_row_below')} className="w-full text-left px-4 py-1.5 text-sm hover:bg-gray-50 flex items-center gap-3 transition-colors">
                        <FiPlus className="w-4 h-4 text-blue-400" /> Add Row Below
                    </button>
                    <button onClick={() => handleCellAction('move_row')} className="w-full text-left px-4 py-1.5 text-sm hover:bg-gray-50 flex items-center gap-3 transition-colors">
                        <FiArrowRight className="w-4 h-4 text-blue-400" /> Move Row
                    </button>
                    <button onClick={() => handleCellAction('select_multiple_rows')} className="w-full text-left px-4 py-1.5 text-sm hover:bg-gray-50 flex items-center gap-3 transition-colors">
                        <FiList className="w-4 h-4 text-blue-400" /> Select Multiple Rows
                    </button>

                    <div className="my-1 border-t border-gray-100"></div>
                    <button onClick={() => {
                        const row = filteredRows[activeCellMenu.rowIndex];
                        const cell = row?.cells?.find(c => c.columnId === activeCellMenu.colId);
                        openCommentPanel(cell?.id, row?.id, activeCellMenu.colId);
                        setActiveCellMenu(null);
                    }} className="w-full text-left px-4 py-1.5 text-sm hover:bg-gray-50 flex items-center gap-3 transition-colors">
                        <FiMessageSquare className="w-4 h-4 text-blue-400" /> Comments
                    </button>
                    <div className="my-1 border-t border-gray-100"></div>
                    <button onClick={() => handleCellAction('erase_data')} className="w-full text-left px-4 py-1.5 text-sm hover:bg-red-50 text-red-600 flex items-center gap-3 transition-colors mt-1">
                        <FiDelete className="w-4 h-4 text-red-400" /> Erase Cell Data
                    </button>
                    <button onClick={() => handleCellAction('delete_row')} className="w-full text-left px-4 py-1.5 text-sm hover:bg-red-50 text-red-600 flex items-center gap-3 transition-colors">
                        <FiTrash2 className="w-4 h-4 text-red-400" /> Delete Row
                    </button>
                </div>
            )}

            {/* Column Modal */}
            {isColumnModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
                            <h2 className="font-semibold text-gray-800 text-lg">
                                {editingColId ? 'Rename/Edit Column' : 'Choose Column Type'}
                            </h2>
                            <button
                                onClick={() => setIsColumnModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <FiX className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-semibold text-gray-700">
                                        Name
                                    </label>
                                    <input
                                        type="text"
                                        value={newColumnName}
                                        onChange={(e) => setNewColumnName(e.target.value)}
                                        placeholder="Enter name for Column"
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder-gray-400 bg-gray-50/50"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                {columnTypes.map(type => (
                                    <div
                                        key={type.id}
                                        onClick={() => setNewColumnType(type.id)}
                                        className={`flex items-start gap-4 p-4 rounded-xl cursor-pointer transition-all border-2
                                            ${newColumnType === type.id
                                                ? 'border-blue-500 bg-blue-50/50 shadow-sm'
                                                : 'border-transparent hover:bg-gray-50'}`}
                                    >
                                        <div className="w-10 h-10 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center shrink-0">
                                            {type.icon}
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-semibold text-gray-900 leading-tight">{type.name}</h4>
                                            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{type.desc}</p>
                                        </div>
                                        <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center shrink-0 mt-0.5 transition-colors">
                                            <div className={`w-2.5 h-2.5 rounded-full transition-transform ${newColumnType === type.id ? 'bg-blue-500 scale-100' : 'scale-0'}`} />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Column Color Selection */}
                            <div className="space-y-3 mt-4 pt-4 border-t border-gray-100">
                                <label className="block text-sm font-semibold text-gray-700">Column Color</label>
                                <div className="flex flex-wrap gap-2">
                                    {COLOR_PALETTE.map((color) => (
                                        <button
                                            key={color.name}
                                            onClick={() => setNewColumnBgColor(color.value)}
                                            className={`w-8 h-8 rounded-full border-2 transition-all ${newColumnBgColor === color.value ? 'border-blue-500 scale-110 shadow-sm' : 'border-gray-200 hover:border-gray-300'}`}
                                            style={{ backgroundColor: color.value || '#fff' }}
                                            title={color.name}
                                        >
                                            {!color.value && <FiX className="w-4 h-4 text-gray-400 mx-auto" />}
                                        </button>
                                    ))}
                                </div>

                                <label className="flex items-center gap-3 cursor-pointer mt-4 group">
                                    <div
                                        onClick={() => setNewColumnIsRowColorSource(!newColumnIsRowColorSource)}
                                        className={`w-10 h-5 rounded-full relative transition-colors ${newColumnIsRowColorSource ? 'bg-blue-500' : 'bg-gray-300'}`}
                                    >
                                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${newColumnIsRowColorSource ? 'left-6' : 'left-1'}`} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-semibold text-gray-700">Apply this color to the whole row</span>
                                        <span className="text-[10px] text-gray-500">Row background will match this column's color</span>
                                    </div>
                                </label>
                            </div>

                            {(newColumnType === 'currency' || newColumnType === 'formula') && (
                                <div className="space-y-1.5 mt-4">
                                    <label className="block text-sm font-semibold text-gray-700">Currency Code (if applicable)</label>
                                    <div className="relative">
                                        <select
                                            value={newColumnCurrencyCode}
                                            onChange={(e) => setNewColumnCurrencyCode(e.target.value)}
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 appearance-none text-sm text-gray-700"
                                        >
                                            {SUPPORTED_CURRENCIES.map(curr => (
                                                <option key={curr.code} value={curr.code}>
                                                    {curr.code} ({curr.symbol}) - {curr.name}
                                                </option>
                                            ))}
                                        </select>
                                        <FiChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-100 shrink-0">
                            <button
                                onClick={() => setIsColumnModalOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors border border-transparent"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpdateColumn}
                                disabled={!newColumnName.trim()}
                                className="px-5 py-2 text-sm font-medium bg-[#3b82f6] hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors shadow-sm"
                            >
                                {editingColId ? 'Save Changes' : 'Add Column'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Formula Builder Modal */}
            {isFormulaModalOpen && pendingFormulaColumnDesc && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
                            <h2 className="font-semibold text-gray-800 text-lg">
                                Add Formula to "{pendingFormulaColumnDesc.name}"
                            </h2>
                            <button
                                onClick={() => {
                                    setIsFormulaModalOpen(false);
                                    setFormulaString('');
                                    setPendingFormulaColumnDesc(null);
                                    setIsColumnModalOpen(true); // Go back to first modal
                                }}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <FiX className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Formula Input Box */}
                            <div className="w-full">
                                <input
                                    type="text"
                                    value={formulaString}
                                    onChange={(e) => setFormulaString(e.target.value)}
                                    placeholder="Eg. (Column A + Column B)/12"
                                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-gray-700 bg-gray-50"
                                    autoFocus
                                />
                            </div>

                            <div className="flex gap-6 pt-2">
                                {/* Left Side: Clickable Columns List */}
                                <div className="w-1/2 flex flex-col">
                                    <div className="text-xs text-gray-500 mb-2 font-medium">
                                        Add column values to formula by clicking column names from below list:
                                    </div>
                                    <div className="flex-col overflow-y-auto max-h-56 pr-2 space-y-1.5 custom-scrollbar">
                                        {columns.map((col, idx) => {
                                            if (col.id === pendingFormulaColumnDesc.id) return null; // Don't allow self-reference

                                            // Calculate A1 notation for this column (e.g., A, B, C...)
                                            const letter = String.fromCharCode(65 + (idx % 26));

                                            return (
                                                <button
                                                    key={col.id}
                                                    onClick={() => setFormulaString(prev => prev + col.name)}
                                                    className="w-full text-left flex items-center gap-3 px-3 py-2 border border-gray-100 rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-colors group bg-white"
                                                >
                                                    <div className="w-6 flex justify-center text-gray-400 group-hover:text-blue-500">
                                                        {col.type === 'number' ? <span className="text-xs font-medium">123</span> :
                                                            col.type === 'currency' ? <span className="text-sm">₹</span> :
                                                                col.type === 'formula' ? <span className="italic font-serif text-sm">fx</span> :
                                                                    col.type === 'date' ? <span className="text-sm">📅</span> :
                                                                        <span className="font-serif">T</span>}
                                                    </div>
                                                    <span className="text-sm text-gray-700 font-medium group-hover:text-blue-700">{col.name}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Right Side: Calculator Keypad */}
                                <div className="w-1/2 flex flex-col gap-2">
                                    <div className="flex justify-end mb-1">
                                        <button
                                            onClick={() => setFormulaString(prev => prev.slice(0, -1))}
                                            className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded text-sm transition-colors"
                                        >
                                            Delete
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-4 gap-2 flex-grow">
                                        {['+', '-', '/', '*', '7', '8', '9', '%', '4', '5', '6', '(', '1', '2', '3', ')', 'fn', '0', '.', ','].map(key => (
                                            <button
                                                key={key}
                                                onClick={() => {
                                                    if (key !== 'fn') setFormulaString(prev => prev + key);
                                                }}
                                                className="bg-gray-50 hover:bg-gray-100 border border-gray-100 shadow-sm rounded-lg text-gray-700 font-medium py-3 transition-colors active:bg-gray-200 text-sm"
                                            >
                                                {key}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-100 shrink-0 bg-gray-50/50">
                            <button
                                onClick={() => {
                                    setIsFormulaModalOpen(false);
                                    setFormulaString('');
                                    setPendingFormulaColumnDesc(null);
                                    setIsColumnModalOpen(true);
                                }}
                                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-200 bg-white rounded-lg transition-colors border border-gray-200 shadow-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    let query = formulaString;
                                    if (!query.startsWith('=')) query = '=' + query;

                                    // Submit to the original payload handler
                                    const formulaColCurrencyCode = pendingFormulaColumnDesc.currencyCode;

                                    // Set state so saveColumnToBackend uses correct currency
                                    setNewColumnCurrencyCode(formulaColCurrencyCode);

                                    saveColumnToBackend(
                                        pendingFormulaColumnDesc.name,
                                        pendingFormulaColumnDesc.type,
                                        pendingFormulaColumnDesc.id,
                                        query
                                    );
                                }}
                                disabled={!formulaString.trim()}
                                className="px-5 py-2 text-sm font-medium bg-[#3b82f6] hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors shadow-sm"
                            >
                                Add Formula
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Image Gallery Modal */}
            {isImageGalleryOpen && activeImageCell && (
                <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 sm:p-6">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col h-[85vh]">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
                            <h2 className="font-semibold text-gray-800 text-lg flex items-center gap-2">
                                <FiImage className="text-blue-500" />
                                Image Gallery <span className="text-gray-400 text-sm font-normal">({activeImageCell.images?.length || 0} images)</span>
                            </h2>
                            <button
                                onClick={() => setIsImageGalleryOpen(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                            >
                                <FiX className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
                            {activeImageCell.images?.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-3">
                                    <FiImage className="w-16 h-16 text-gray-200" />
                                    <p>No images in this cell</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {activeImageCell.images.map((img, index) => (
                                        <div key={index} className="group relative aspect-square bg-gray-100 rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                            <a href={`${import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:6041'}${img.url}`} target="_blank" rel="noreferrer" className="block w-full h-full">
                                                <img
                                                    src={`${import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:6041'}${img.url}`}
                                                    alt={img.fileName || 'Cell Image'}
                                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                    loading="lazy"
                                                />
                                            </a>
                                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 pt-6 opacity-0 group-hover:opacity-100 transition-opacity flex justify-between items-end">
                                                <div className="text-[10px] text-white/90 truncate pr-2">
                                                    {img.fileName}
                                                </div>
                                                <button
                                                    onClick={(e) => { e.preventDefault(); handleDeleteImage(index); }}
                                                    className="text-red-400 hover:text-red-300 bg-white/10 rounded p-1 backdrop-blur-sm shrink-0"
                                                    title="Delete image"
                                                >
                                                    <FiTrash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer Upload Area */}
                        <div className="p-4 border-t border-gray-100 bg-white shrink-0">
                            <div className="flex items-center gap-4">
                                <label className="flex-1 flex items-center justify-center gap-2 py-3 px-4 border-2 border-dashed border-gray-300 rounded-xl hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600 transition-colors cursor-pointer text-gray-500 font-medium group">
                                    {isUploadingImages ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Uploading...
                                        </>
                                    ) : (
                                        <>
                                            <FiUploadCloud className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
                                            Upload Images
                                            <input
                                                type="file"
                                                multiple
                                                accept="image/*"
                                                className="hidden"
                                                ref={fileInputRef}
                                                onChange={handleImagesSelected}
                                            />
                                        </>
                                    )}
                                </label>
                            </div>
                            <p className="text-center text-xs text-gray-400 mt-2">
                                Accepts multiple images. Max 50MB per file.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Comment Panel Modal ──────────────────────────────────────── */}
            {commentPanelCell && (
                <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4" onClick={closeCommentPanel}>
                    <div
                        className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
                            <h2 className="font-semibold text-gray-800 text-lg flex items-center gap-2">
                                <FiMessageSquare className="text-blue-500 w-5 h-5" />
                                Comments
                            </h2>
                            <button onClick={closeCommentPanel} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <FiX className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Comments Thread */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[200px]">
                            {commentsLoading ? (
                                <div className="flex justify-center items-center h-32">
                                    <svg className="animate-spin h-6 w-6 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                </div>
                            ) : commentsList.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                                    <FiMessageSquare className="w-10 h-10 text-gray-200 mb-2" />
                                    <p className="text-sm">No comments yet</p>
                                    <p className="text-xs text-gray-300 mt-1">Be the first to add a comment</p>
                                </div>
                            ) : (
                                commentsList.map(comment => {
                                    const isOwner = currentUser?.id === comment.userId;
                                    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'superadmin';
                                    const isEditing = editingComment?.id === comment.id;

                                    return (
                                        <div key={comment.id} className="group">
                                            <div className="flex items-start gap-3">
                                                {/* Avatar */}
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">
                                                    {(comment.author?.name || 'U').charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-sm text-gray-800">
                                                            {comment.author?.name || 'Unknown User'}
                                                        </span>
                                                        <span className="text-[11px] text-gray-400">
                                                            {new Date(comment.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}, {new Date(comment.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                        {comment.updatedAt !== comment.createdAt && (
                                                            <span className="text-[10px] text-gray-300 italic">(edited)</span>
                                                        )}
                                                        {/* Edit / Delete buttons */}
                                                        {(isOwner || isAdmin) && !isEditing && (
                                                            <div className="flex items-center gap-1 ml-auto">
                                                                {isOwner && (
                                                                    <button
                                                                        onClick={() => setEditingComment({ id: comment.id, text: comment.text })}
                                                                        className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                                                                        title="Edit"
                                                                    >
                                                                        <FiEdit2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() => handleDeleteComment(comment.id)}
                                                                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                                                    title="Delete"
                                                                >
                                                                    <FiTrash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {/* Comment text or edit input */}
                                                    {isEditing ? (
                                                        <div className="mt-1 flex gap-2">
                                                            <input
                                                                type="text"
                                                                value={editingComment.text}
                                                                onChange={(e) => setEditingComment(prev => ({ ...prev, text: e.target.value }))}
                                                                className="flex-1 px-3 py-1.5 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50/30"
                                                                autoFocus
                                                                onKeyDown={(e) => { if (e.key === 'Enter') handleEditComment(comment.id); if (e.key === 'Escape') setEditingComment(null); }}
                                                                maxLength={2000}
                                                            />
                                                            <button
                                                                onClick={() => handleEditComment(comment.id)}
                                                                disabled={!editingComment.text.trim() || commentSubmitting}
                                                                className="px-3 py-1.5 text-xs font-medium bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50 transition-colors"
                                                            >
                                                                Save
                                                            </button>
                                                            <button
                                                                onClick={() => setEditingComment(null)}
                                                                className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm text-gray-600 mt-0.5 leading-relaxed whitespace-pre-wrap break-words">{comment.text}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Add Comment Input */}
                        <div className="p-4 border-t border-gray-100 bg-gray-50/50 shrink-0">
                            <div className="flex items-end gap-2">
                                <textarea
                                    value={newCommentText}
                                    onChange={(e) => setNewCommentText(e.target.value)}
                                    placeholder="Type your comment here..."
                                    className="flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none bg-white transition-all placeholder-gray-400"
                                    rows={2}
                                    maxLength={2000}
                                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
                                />
                                <button
                                    onClick={handleAddComment}
                                    disabled={!newCommentText.trim() || commentSubmitting}
                                    className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors shadow-sm flex items-center gap-1.5 text-sm font-medium shrink-0"
                                >
                                    {commentSubmitting ? (
                                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    ) : (
                                        <FiSend className="w-4 h-4" />
                                    )}
                                    Add
                                </button>
                            </div>
                            <p className="text-[11px] text-gray-400 mt-1.5 ml-1">Press Enter to submit, Shift+Enter for new line</p>
                        </div>
                    </div>
                </div>
            )}
            {/* Share Modal */}
            <ShareModal
                isOpen={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
                sheetId={docName}
            />
        </div>
    );
}
