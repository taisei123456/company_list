// script.js
document.addEventListener('DOMContentLoaded', () => {

    const navButtons = document.querySelectorAll('.nav-btn');
    const views = document.querySelectorAll('.view');
    const companyForm = document.getElementById('company-form');
    const companyListDiv = document.getElementById('companyList');
    const showCompareBtn = document.getElementById('showCompareBtn');
    const detailsModal = document.getElementById('details-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    const alertModal = document.getElementById('alert-modal');
    const alertMessage = document.getElementById('alert-message');
    const closeModalBtn = document.querySelector('.close-modal-btn');
    const closeAlertBtn = document.querySelector('.close-alert-btn');
    
    const formSubmitBtn = companyForm.querySelector('button[type="submit"]');
    const formTitle = document.querySelector('#register-view .section-title');

    let isEditMode = false;
    let currentCompanyId = null;

    // 画面切り替え機能
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.dataset.target;
            views.forEach(view => {
                view.classList.remove('active-view');
            });
            document.getElementById(targetId).classList.add('active-view');
            if (targetId === 'list-view') {
                fetchCompanies();
            }
            if (targetId === 'register-view') {
                resetForm();
            }
        });
    });

    // 企業登録/更新フォームの送信
    companyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(companyForm);
        const data = Object.fromEntries(formData.entries());
        
        let url = '/api/companies';
        let method = 'POST';

        if (isEditMode) {
            url = `/api/companies/${currentCompanyId}`;
            method = 'PUT';
        }

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            if (result.success) {
                showAlert(result.message);
                resetForm();
                document.querySelector('.nav-btn[data-target="list-view"]').click();
            } else {
                showAlert(result.message);
            }
        } catch (error) {
            showAlert('通信エラーが発生しました。');
            console.error('Error:', error);
        }
    });

    // フォームを初期状態に戻す
    function resetForm() {
        companyForm.reset();
        formTitle.textContent = '企業情報入力';
        formSubmitBtn.textContent = '登録';
        isEditMode = false;
        currentCompanyId = null;
    }

    // 企業一覧の取得と表示
    async function fetchCompanies() {
        companyListDiv.innerHTML = '<p class="empty-message">読み込み中...</p>';
        try {
            const response = await fetch('/api/companies');
            const result = await response.json();

            if (result.success) {
                const companies = result.companies;
                companyListDiv.innerHTML = '';
                if (companies.length === 0) {
                    companyListDiv.innerHTML = '<p class="empty-message">まだ企業が登録されていません。</p>';
                } else {
                    companies.forEach(company => {
                        const foundedDate = company.foundedDate ? new Date(company.foundedDate).toLocaleDateString() : '不明';
                        const card = document.createElement('div');
                        card.classList.add('company-card');
                        card.innerHTML = `
                            <h3>${company.companyName}</h3>
                            <p><strong>設立日:</strong> ${foundedDate}</p>
                            <p><strong>従業員数:</strong> ${company.employees || '不明'}</p>
                            <div class="card-actions">
                                <input type="checkbox" data-id="${company.id}">
                                <button class="edit-btn" data-id="${company.id}">編集</button>
                                <button class="delete-btn" data-id="${company.id}">削除</button>
                            </div>
                        `;
                        // 詳細モーダル表示
                        card.querySelector('h3').addEventListener('click', () => {
                             showDetailsModal(company);
                        });
                        // 編集ボタンのクリックイベントを追加
                        const editBtn = card.querySelector('.edit-btn');
                        editBtn.addEventListener('click', async (e) => {
                            e.stopPropagation();
                            editCompany(e.target.dataset.id);
                        });
                        // 削除ボタンのクリックイベントを追加
                        const deleteBtn = card.querySelector('.delete-btn');
                        deleteBtn.addEventListener('click', async (e) => {
                            e.stopPropagation();
                            const companyId = e.target.dataset.id;
                            if (window.confirm('本当にこの企業情報を削除しますか？')) {
                                await deleteCompany(companyId);
                            }
                        });
                        companyListDiv.appendChild(card);
                    });
                }
            } else {
                showAlert('企業情報の取得に失敗しました: ' + result.message);
            }
        } catch (error) {
            showAlert('通信エラーが発生しました。');
            console.error('Error:', error);
        }
    }

    // 編集機能の追加
    async function editCompany(companyId) {
        try {
            const response = await fetch(`/api/companies/${companyId}`);
            const result = await response.json();
            if (result.success) {
                const company = result.company;
                
                // フォームにデータをセット
                for (const key in company) {
                    const input = companyForm.querySelector(`[name="${key}"]`);
                    if (input) {
                        input.value = company[key] || '';
                    }
                }
                
                // フォームを編集モードに設定
                isEditMode = true;
                currentCompanyId = company.id;
                formTitle.textContent = '企業情報編集';
                formSubmitBtn.textContent = '更新';

                // 登録画面に遷移
                document.querySelector('.nav-btn[data-target="register-view"]').click();
            } else {
                showAlert(result.message);
            }
        } catch (error) {
            showAlert('編集情報の取得に失敗しました。');
            console.error('Error:', error);
        }
    }

    // 削除機能
    async function deleteCompany(companyId) {
        try {
            const response = await fetch(`/api/companies/${companyId}`, {
                method: 'DELETE'
            });
            const result = await response.json();
            if (result.success) {
                showAlert('企業情報を削除しました。');
                fetchCompanies();
            } else {
                showAlert('削除に失敗しました: ' + result.message);
            }
        } catch (error) {
            showAlert('削除中にエラーが発生しました。');
            console.error('Error:', error);
        }
    }

    // 比較機能（Flask APIと連携）
    showCompareBtn.addEventListener('click', async () => {
        const checkboxes = document.querySelectorAll('#companyList input[type="checkbox"]:checked');
        const selectedIds = Array.from(checkboxes).map(cb => cb.dataset.id);
        
        if (selectedIds.length < 2) {
            showAlert('比較する企業を2つ以上選択してください。');
            return;
        }
        
        try {
            const response = await fetch('/api/compare', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ids: selectedIds })
            });
            const result = await response.json();

            if (result.success) {
                document.querySelector('.nav-btn[data-target="compare-view"]').click();
                renderCompareTable(result.companies);
            } else {
                showAlert('比較情報の取得に失敗しました: ' + result.message);
            }
        } catch (error) {
            showAlert('比較情報の取得中にエラーが発生しました。');
            console.error('Error:', error);
        }
    });

    // 企業詳細モーダル表示
    function showDetailsModal(company) {
        modalTitle.textContent = company.companyName;
        let modalContent = '';
        const formFields = document.querySelectorAll('#company-form input, #company-form textarea');
        formFields.forEach(field => {
            const label = document.querySelector(`label[for="${field.id}"]`).textContent.replace('*', '');
            const value = company[field.name] || 'なし';
            modalContent += `<p><strong>${label}:</strong> ${value}</p>`;
        });
        modalBody.innerHTML = modalContent;
        detailsModal.style.display = 'block';
    }

    // 比較テーブル描画
    function renderCompareTable(companies) {
        const tableContainer = document.getElementById('compareTableContainer');
        tableContainer.innerHTML = '';
        if (companies.length === 0) {
            tableContainer.innerHTML = '<p class="empty-message">比較する企業が見つかりませんでした。</p>';
            return;
        }

        const table = document.createElement('table');
        table.classList.add('compare-table');
        let html = '<thead><tr><th>項目</th>';
        companies.forEach(c => {
            html += `<th>${c.companyName}</th>`;
        });
        html += '</tr></thead><tbody>';

        const fields = {
            'corporatePhilosophy': '企業理念', 'ceoName': '代表者名', 'headquarters': '本社所在地',
            'foundedDate': '設立日',
            'employees': '従業員数', 'majorClients': '主要取引先',
            'capital': '資本金 (万円)', 'sales': '売上高 (万円)', 'roe': '自己資本比率 (ROE) (%)',
            'operatingProfitMargin': '経常利益率 (%)', 'mainBusiness': '主力事業', 'strengths': '企業の強み',
            'weaknesses': '企業の弱み', 'targetCustomers': 'ターゲット顧客', 'idealCandidate': '求める人材像',
            'recruitingPositions': '募集職種', 'hiringCount': '採用予定数', 'startingSalary': '初任給 (円)',
            'bonus': '賞与', 'workLocation': '勤務地', 'workingHours': '勤務時間 (月残業時間)',
            'annualHolidays': '年間休日数', 'benefits': '福利厚生', 'turnoverRate': '離職率 (%)',
            'averageAge': '平均年齢', 'averageAnnualSalary': '平均年収 (万円)', 'notes': 'メモ欄'
        };

        for (const key in fields) {
            html += `<tr><td>${fields[key]}</td>`;
            companies.forEach(c => {
                const value = fields[key] === '設立日' && c[key] ? new Date(c[key]).toLocaleDateString() : c[key] || '-';
                html += `<td>${value}</td>`;
            });
            html += '</tr>';
        }

        html += '</tbody>';
        table.innerHTML = html;
        tableContainer.appendChild(table);
    }

    // カスタムアラートモーダル
    function showAlert(message) {
        alertMessage.textContent = message;
        alertModal.style.display = 'block';
    }

    closeModalBtn.addEventListener('click', () => { detailsModal.style.display = 'none'; });
    closeAlertBtn.addEventListener('click', () => { alertModal.style.display = 'none'; });

    window.addEventListener('click', (e) => {
        if (e.target === detailsModal) { detailsModal.style.display = 'none'; }
        if (e.target === alertModal) { alertModal.style.display = 'none'; }
    });
});
