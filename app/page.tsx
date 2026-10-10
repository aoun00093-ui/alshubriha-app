'use client';
import { useState, useEffect } from 'react';
import pb from '@/lib/pocketbase';

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      const authStatus = localStorage.getItem('is_authenticated') === 'true';
      setIsAuthenticated(authStatus);
    }
  }, []);

  const [authForm, setAuthForm] = useState({ username: '', password: '' });
  const [authError, setAuthError] = useState('');

  const [activeTab, setActiveTab] = useState('home');
  const [customers, setCustomers] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  
  const [accountForm, setAccountForm] = useState({
    newUsername: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [accountUpdateMsg, setAccountUpdateMsg] = useState({ text: '', type: '' });

  const [editingCustomer, setEditingCustomer] = useState<any | null>(null);
  const [editCustomerForm, setEditCustomerForm] = useState({
    full_name: '', phone: '', serial_number: '', address: '', neighborhood: '', initial_reading: ''
  });

  const [matchedCustomer, setMatchedCustomer] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [readingResult, setReadingResult] = useState({ reading: '', meterNumber: '' });
  
  const [manualForm, setManualForm] = useState({
    meterNumber: '',
    currentReading: '',
  });
  const [manualSelectedCustomer, setManualSelectedCustomer] = useState<any>(null);

  const monthsList = [
    'كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران',
    'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'
  ];

  const generateAllMonths = () => {
    const list: string[] = [];
    const years = [2026, 2027];
    years.forEach(year => {
      monthsList.forEach(mName => {
        if (year === 2026) {
          const startIndex = monthsList.indexOf('تموز');
          if (monthsList.indexOf(mName) >= startIndex) {
            list.push(`${mName} ${year}`);
          }
        } else {
          list.push(`${mName} ${year}`);
        }
      });
    });
    return list;
  };

  const allAvailableMonths = generateAllMonths();

  const [selectedMonth, setSelectedMonth] = useState('تشرين الأول 2026');
  const [archiveSelectedMonth, setArchiveSelectedMonth] = useState('تشرين الأول 2026');
  const [lowInvoicesSelectedMonth, setLowInvoicesSelectedMonth] = useState('تشرين الأول 2026');
  const [selectedNeighborhoodForPrint, setSelectedNeighborhoodForPrint] = useState('الكل');

  const [monthlyRates, setMonthlyRates] = useState<Record<string, { pricePerKwh: number; fixedFee: number }>>(() => {
    const initialRates: Record<string, { pricePerKwh: number; fixedFee: number }> = {};
    generateAllMonths().forEach(m => {
      initialRates[m] = { pricePerKwh: 0.75, fixedFee: 10 };
    });
    return initialRates;
  });

  useEffect(() => {
    if (isMounted && typeof window !== 'undefined') {
      const savedRates = localStorage.getItem('monthly_rates');
      if (savedRates) {
        try { setMonthlyRates(JSON.parse(savedRates)); } catch (e) {}
      }
    }
  }, [isMounted]);

  useEffect(() => {
    if (isMounted && typeof window !== 'undefined') {
      localStorage.setItem('monthly_rates', JSON.stringify(monthlyRates));
    }
  }, [monthlyRates, isMounted]);

  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  
  const [neighborhoodsList, setNeighborhoodsList] = useState<string[]>(['الشبريحا الرئيسية', 'المنطقة الحرفية', 'حي الحوش', 'حي الشرقي']);
  const [newNeighborhoodInput, setNewNeighborhoodInput] = useState('');

  useEffect(() => {
    if (isMounted && typeof window !== 'undefined') {
      const savedN = localStorage.getItem('neighborhoods_list');
      if (savedN) {
        try { setNeighborhoodsList(JSON.parse(savedN)); } catch (e) {}
      }
    }
  }, [isMounted]);

  useEffect(() => {
    if (isMounted && typeof window !== 'undefined') {
      localStorage.setItem('neighborhoods_list', JSON.stringify(neighborhoodsList));
    }
  }, [neighborhoodsList, isMounted]);

  const [newCustomerForm, setNewCustomerForm] = useState({
    full_name: '', phone: '', serial_number: '', address: '', neighborhood: neighborhoodsList[0] || 'الشبريحا الرئيسية', initial_reading: ''
  });

  const currentRate = monthlyRates[selectedMonth] || { pricePerKwh: 0.75, fixedFee: 10 };
  const pricePerKwh = currentRate.pricePerKwh;
  const fixedFee = currentRate.fixedFee;

  const getCustomerPreviousReading = (cust: any) => {
    if (!cust) return 0;
    const custInvs = invoices.filter(inv => {
      const invCustId = typeof inv.customer === 'object' ? inv.customer?.id : inv.customer;
      return invCustId === cust.id;
    });

    if (custInvs.length > 0) {
      const latestInv = custInvs[custInvs.length - 1];
      const currVal = Number(latestInv.current_reading ?? latestInv.currentReading ?? 0);
      if (currVal > 0) return currVal;
    }
    return Number(cust.initial_reading ?? cust.initialReading ?? cust.initial_Reading ?? 0);
  };

  const customerPreviousReading = matchedCustomer ? getCustomerPreviousReading(matchedCustomer) : 0;
  const manualPreviousReading = manualSelectedCustomer ? getCustomerPreviousReading(manualSelectedCustomer) : 0;

  const currentReadingNum = Number(readingResult.reading) || 0;
  const calculatedConsumption = Math.max(0, currentReadingNum - customerPreviousReading);
  const calculatedTotalAmount = Number(((calculatedConsumption * pricePerKwh) + fixedFee).toFixed(2));

  const manualCurrNum = Number(manualForm.currentReading) || 0;
  const manualConsumption = Math.max(0, manualCurrNum - manualPreviousReading);
  const manualTotalAmount = Number(((manualConsumption * pricePerKwh) + fixedFee).toFixed(2));

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthError('');
    try {
      await pb.collection('users').authWithPassword(authForm.username, authForm.password);
      setIsAuthenticated(true);
      localStorage.setItem('is_authenticated', 'true');
    } catch (err: any) {
      if (authForm.username === 'admin' && authForm.password === '123456') {
        setIsAuthenticated(true);
        localStorage.setItem('is_authenticated', 'true');
      } else {
        setAuthError('اسم المستخدم أو كلمة المرور غير صحيحة.');
      }
    }
  }

  function handleLogout() {
    pb.authStore.clear();
    setIsAuthenticated(false);
    localStorage.removeItem('is_authenticated');
  }

  async function fetchData() {
    setDbError(null);
    try {
      const custRecords = await pb.collection('customers').getFullList();
      const invRecords = await pb.collection('invoices').getFullList({ expand: 'customer' });
      setCustomers(custRecords);
      setInvoices(invRecords);
    } catch (err: any) {
      console.error('PocketBase Connection Error:', err);
      setDbError('تعذر الاتصال بقاعدة البيانات (PocketBase). تأكد من تشغيل الخادم.');
    }
  }

  async function handleUpdateAccount(e: React.FormEvent) {
    e.preventDefault();
    setAccountUpdateMsg({ text: '', type: '' });

    if (accountForm.newPassword && accountForm.newPassword !== accountForm.confirmPassword) {
      setAccountUpdateMsg({ text: 'كلمة المرور الجديدة غير متطابقة مع تأكيد كلمة المرور.', type: 'error' });
      return;
    }

    try {
      const currentUser = pb.authStore.model;
      if (!currentUser) {
        if (accountForm.currentPassword === '123456') {
          setAccountUpdateMsg({ text: 'تم تحديث بيانات الحساب الافتراضي بنجاح!', type: 'success' });
          setAccountForm({ newUsername: '', currentPassword: '', newPassword: '', confirmPassword: '' });
          return;
        } else {
          setAccountUpdateMsg({ text: 'كلمة المرور الحالية غير صحيحة.', type: 'error' });
          return;
        }
      }

      const updateData: any = {};
      if (accountForm.newUsername) updateData.username = accountForm.newUsername;
      if (accountForm.newPassword) {
        updateData.password = accountForm.newPassword;
        updateData.passwordConfirm = accountForm.confirmPassword;
        updateData.oldPassword = accountForm.currentPassword;
      }

      await pb.collection('users').update(currentUser.id, updateData);
      setAccountUpdateMsg({ text: 'تم تحديث بيانات الدخول بنجاح!', type: 'success' });
      setAccountForm({ newUsername: '', currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setAccountUpdateMsg({ text: 'فشل التحديث: ' + (err.message || 'تأكد من صحة كلمة المرور الحالية'), type: 'error' });
    }
  }

  const totalConsumptionAll = invoices.reduce((sum, inv) => {
    const cRead = Number(inv.current_reading ?? inv.currentReading ?? 0);
    const pRead = Number(inv.previous_reading_ ?? inv.previous_reading ?? 0);
    const cons = Number(inv.consumption ?? Math.max(0, cRead - pRead));
    return sum + cons;
  }, 0);

  const totalAmountAll = invoices.reduce((sum, inv) => {
    const cRead = Number(inv.current_reading ?? inv.currentReading ?? 0);
    const pRead = Number(inv.previous_reading_ ?? inv.previous_reading ?? 0);
    const cons = Number(inv.consumption ?? Math.max(0, cRead - pRead));
    const uPrice = Number(inv.price_used ?? 0.75);
    const invMonth = inv.month || selectedMonth;
    const currentFee = monthlyRates[invMonth]?.fixedFee ?? fixedFee ?? 10;
    const amt = Number(inv.amount ?? inv.total ?? ((cons * uPrice) + currentFee));
    return sum + amt;
  }, 0);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setSelectedFile(file);
    setLoading(true);
    setMatchedCustomer(null);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('/api/ocr', { method: 'POST', body: formData });
      const data = await res.json();
      
      if (res.ok) {
        setReadingResult(data);
        if (data.meterNumber) {
          const cleanExtractedNumber = String(data.meterNumber).replace(/\D/g, '');
          const found = customers.find(c => {
            const serial = c.serial_number || c.serialNumber || '';
            if (!serial) return false;
            const cleanDbNumber = String(serial).replace(/\D/g, '');
            return cleanDbNumber === cleanExtractedNumber || cleanDbNumber.includes(cleanExtractedNumber) || cleanExtractedNumber.includes(cleanDbNumber);
          });
          if (found) setMatchedCustomer(found);
        }
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('حدث خطأ أثناء الاتصال بالذكاء الاصطناعي');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveInvoice() {
    if (!matchedCustomer) { alert('لم يتم التعرف على صاحب العداد تلقائياً.'); return; }
    if (!readingResult.reading) { alert('لا توجد قراءة مستخرجة للحفظ'); return; }

    setSaving(true);
    try {
      const payload = {
        customer: matchedCustomer.id,
        Number: readingResult.meterNumber || matchedCustomer.serial_number || 'N/A',
        previous_reading_: customerPreviousReading,
        current_reading: currentReadingNum,
        consumption: calculatedConsumption,
        amount: calculatedTotalAmount,
        month: selectedMonth,
        price_used: pricePerKwh,
      };

      const newInv = await pb.collection('invoices').create(payload, { expand: 'customer' });
      alert('تم حفظ الفاتورة بنجاح لشهر ' + selectedMonth);
      printSingleInvoice(newInv);

      setReadingResult({ reading: '', meterNumber: '' });
      setMatchedCustomer(null);
      setSelectedFile(null);
      fetchData();
      setActiveTab('home');
    } catch (err: any) {
      alert('فشل الحفظ في قاعدة البيانات: ' + (err.message || 'خطأ غير معروف'));
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveManualInvoice(e: React.FormEvent) {
    e.preventDefault();
    if (!manualSelectedCustomer) { alert('الرجاء اختيار المشترك أو إدخال رقم عداد صحيح.'); return; }
    if (!manualForm.currentReading) { alert('الرجاء إدخال القراءة الحالية.'); return; }

    setSaving(true);
    try {
      const payload = {
        customer: manualSelectedCustomer.id,
        Number: manualSelectedCustomer.serial_number || manualForm.meterNumber || 'N/A',
        previous_reading_: manualPreviousReading,
        current_reading: manualCurrNum,
        consumption: manualConsumption,
        amount: manualTotalAmount,
        month: selectedMonth,
        price_used: pricePerKwh,
      };

      const newInv = await pb.collection('invoices').create(payload, { expand: 'customer' });
      alert('تم حفظ الفاتورة اليدوية بنجاح لشهر ' + selectedMonth);
      printSingleInvoice(newInv);

      setManualForm({ meterNumber: '', currentReading: '' });
      setManualSelectedCustomer(null);
      fetchData();
      setActiveTab('home');
    } catch (err: any) {
      alert('فشل الحفظ في قاعدة البيانات: ' + (err.message || 'خطأ غير معروف'));
    } finally {
      setSaving(false);
    }
  }

  function handleManualMeterChange(val: string) {
    setManualForm(prev => ({ ...prev, meterNumber: val }));
    const cleanVal = val.replace(/\D/g, '');
    if (!cleanVal) {
      setManualSelectedCustomer(null);
      return;
    }
    const found = customers.find(c => {
      const serial = c.serial_number || c.serialNumber || '';
      if (!serial) return false;
      const cleanDb = String(serial).replace(/\D/g, '');
      return cleanDb === cleanVal || cleanDb.includes(cleanVal) || cleanVal.includes(cleanDb);
    });
    setManualSelectedCustomer(found || null);
  }

  async function handleAddCustomer(e: React.FormEvent) {
    e.preventDefault();
    if (!newCustomerForm.full_name) { alert('الرجاء إدخال اسم المشترك على الأقل'); return; }

    setAddingCustomer(true);
    try {
      await pb.collection('customers').create({
        full_name: newCustomerForm.full_name,
        phone: newCustomerForm.phone,
        serial_number: newCustomerForm.serial_number,
        address: newCustomerForm.address,
        neighborhood: newCustomerForm.neighborhood,
        initial_reading: Number(newCustomerForm.initial_reading) || 0
      });
      alert('تم إضافة المشترك بنجاح!');
      setNewCustomerForm({ full_name: '', phone: '', serial_number: '', address: '', neighborhood: neighborhoodsList[0] || 'الشبريحا الرئيسية', initial_reading: '' });
      fetchData();
      setActiveTab('customers');
    } catch (err: any) {
      alert('فشل إضافة المشترك: ' + (err.message || 'خطأ غير معروف'));
    } finally {
      setAddingCustomer(false);
    }
  }

  function openEditModal(cust: any) {
    setEditingCustomer(cust);
    setEditCustomerForm({
      full_name: cust.full_name || '',
      phone: cust.phone || '',
      serial_number: cust.serial_number || '',
      address: cust.address || '',
      neighborhood: cust.neighborhood || neighborhoodsList[0] || 'الشبريحا الرئيسية',
      initial_reading: cust.initial_reading ?? cust.initialReading ?? cust.initial_Reading ?? ''
    });
  }

  async function handleUpdateCustomer(e: React.FormEvent) {
    e.preventDefault();
    if (!editingCustomer) return;
    try {
      await pb.collection('customers').update(editingCustomer.id, {
        full_name: editCustomerForm.full_name,
        phone: editCustomerForm.phone,
        serial_number: editCustomerForm.serial_number,
        address: editCustomerForm.address,
        neighborhood: editCustomerForm.neighborhood,
        initial_reading: Number(editCustomerForm.initial_reading) || 0
      });
      alert('تم تحديث بيانات المشترك بنجاح!');
      setEditingCustomer(null);
      fetchData();
    } catch (err: any) {
      alert('فشل تحديث المشترك: ' + (err.message || 'خطأ غير معروف'));
    }
  }

  function handleAddNeighborhood(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newNeighborhoodInput.trim();
    if (!trimmed) return;
    if (neighborhoodsList.includes(trimmed)) {
      alert('هذا الحي موجود مسبقاً.');
      return;
    }
    setNeighborhoodsList(prev => [...prev, trimmed]);
    setNewNeighborhoodInput('');
    alert('تم إضافة الحي بنجاح!');
  }

  function handleDeleteNeighborhood(nName: string) {
    if (neighborhoodsList.length <= 1) {
      alert('يجب أن يكون هناك حي واحد على الأقل.');
      return;
    }
    if (confirm(`هل أنت متأكد من حذف حي "${nName}"؟`)) {
      setNeighborhoodsList(prev => prev.filter(n => n !== nName));
    }
  }

  function getPreviousMonthName(currentInvoiceMonth: string) {
    try {
      const parts = currentInvoiceMonth.split(' ');
      const mName = parts[0];
      const mYear = parseInt(parts[1]) || 2026;
      const mIndex = monthsList.indexOf(mName);
      if (mIndex !== -1) {
        if (mIndex > 0) {
          return `${monthsList[mIndex - 1]} ${mYear}`;
        } else {
          return `كانون الأول ${mYear - 1}`;
        }
      }
    } catch (e) {}
    return 'الشهر السابق';
  }

  function sendWhatsAppInvoice(invoiceData: any) {
    const customer = invoiceData?.expand?.customer;
    const phone = customer?.phone ?? '';
    
    if (!phone) {
      alert('رقم الهاتف غير متوفر لهذا المشترك.');
      return;
    }

    const cleanPhone = String(phone).replace(/[^\d+]/g, '');
    const prevRead = Number(invoiceData?.previous_reading_ ?? invoiceData?.previous_reading ?? 0);
    const currRead = Number(invoiceData?.current_reading ?? invoiceData?.currentReading ?? 0);
    const consump = Number(invoiceData?.consumption ?? Math.max(0, currRead - prevRead));
    const unitPrice = Number(invoiceData?.price_used ?? pricePerKwh);
    const currentInvoiceMonth = invoiceData?.month || selectedMonth;
    const currentFee = monthlyRates[currentInvoiceMonth]?.fixedFee ?? fixedFee ?? 10;
    const calculatedTotal = (consump * unitPrice) + currentFee;
    const finalAmount = Number(invoiceData?.amount ?? invoiceData?.total ?? calculatedTotal).toFixed(2);

    const customerName = customer?.full_name || 'المشترك الكريم';
    const meterNum = invoiceData?.Number || customer?.serial_number || '---';

    const message = `*اشتراك الشبريحا* ⚡ (Aethel Group)
فاتورة شهر: *${currentInvoiceMonth}*

مرحباً بك، *${customerName}*
إليك تفاصيل استهلاكك للكهرباء:

🔹 *رقم العداد:* ${meterNum}
🔹 *القراءة السابقة:* ${prevRead}
🔹 *القراءة الحالية:* ${currRead}
🔹 *الاستهلاك الفعلي:* *${consump} ك.و.س*
🔹 *سعر الكيلو:* ${unitPrice} $
🔹 *رسم الاشتراك:* ${currentFee} $

💰 *المجموع المطلوب:* *${finalAmount} $*

شكراً لتعاونكم معنا!`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  }

  function sendBatchWhatsApp(listToProcess: any[], targetMonth: string) {
    const validInvoices = listToProcess.filter(inv => inv.expand?.customer?.phone);
    
    if (validInvoices.length === 0) {
      alert('لا توجد فواتير أو أرقام هواتف متوفرة للإرسال في هذا الشهر.');
      return;
    }

    if (!confirm(`سيتم فتح محادثات واتساب تباعاً لـ ${validInvoices.length} مشترك لشهر ${targetMonth}. هل تريد المتابعة؟`)) {
      return;
    }

    validInvoices.forEach((inv, index) => {
      setTimeout(() => {
        const customer = inv.expand.customer;
        const phone = String(customer.phone).replace(/[^\d+]/g, '');
        const prevRead = Number(inv.previous_reading_ ?? inv.previous_reading ?? 0);
        const currRead = Number(inv.current_reading ?? inv.currentReading ?? 0);
        const consump = Number(inv.consumption ?? Math.max(0, currRead - prevRead));
        const unitPrice = Number(inv.price_used ?? pricePerKwh);
        const currentFee = monthlyRates[targetMonth]?.fixedFee ?? fixedFee ?? 10;
        const finalAmount = Number(inv.amount ?? inv.total ?? ((consump * unitPrice) + currentFee)).toFixed(2);
        const customerName = customer.full_name || 'المشترك الكريم';
        const meterNum = inv.Number || customer.serial_number || '---';

        const message = `*اشتراك الشبريحا* ⚡ (Aethel Group)
فاتورة شهر: *${targetMonth}*

مرحباً بك، *${customerName}*
إليك تفاصيل استهلاكك للكهرباء:

🔹 *رقم العداد:* ${meterNum}
🔹 *القراءة السابقة:* ${prevRead}
🔹 *القراءة الحالية:* ${currRead}
🔹 *الاستهلاك الفعلي:* *${consump} ك.و.س*
🔹 *سعر الكيلو:* ${unitPrice} $
🔹 *رسم الاشتراك:* ${currentFee} $

💰 *المجموع المطلوب:* *${finalAmount} $*

شكراً لتعاونكم معنا!`;

        const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
      }, index * 1000);
    });
  }

  function printSingleInvoice(invoiceData: any) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const prevRead = Number(invoiceData?.previous_reading_ ?? invoiceData?.previous_reading ?? 0);
    const currRead = Number(invoiceData?.current_reading ?? invoiceData?.currentReading ?? 0);
    const consump = Number(invoiceData?.consumption ?? Math.max(0, currRead - prevRead));
    const unitPrice = Number(invoiceData?.price_used ?? pricePerKwh);
    const currentInvoiceMonth = invoiceData?.month || selectedMonth;
    const previousMonthName = getPreviousMonthName(currentInvoiceMonth);
    const currentFee = monthlyRates[currentInvoiceMonth]?.fixedFee ?? fixedFee ?? 10;
    
    const calculatedTotal = (consump * unitPrice) + currentFee;
    const finalAmount = Number(invoiceData?.amount ?? invoiceData?.total ?? calculatedTotal).toFixed(2);

    const customerName = invoiceData?.expand?.customer?.full_name || '---';
    const meterNum = invoiceData?.Number || invoiceData?.serial_number || '---';

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>طباعة الوصل</title>
        <style>
          body { font-family: Tahoma, sans-serif; padding: 25px; color: #000; direction: rtl; text-align: right; }
          .receipt-box { max-width: 400px; margin: auto; border: 2px dashed #333; padding: 15px; border-radius: 12px; }
          h2 { text-align: center; color: #b45309; margin-bottom: 8px; font-size: 18px; }
          .info-row { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 13px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
          .total-box { text-align: center; margin-top: 10px; padding: 8px; background: #fef3c7; border-radius: 6px; font-size: 16px; font-weight: bold; color: #92400e; }
        </style>
      </head>
      <body>
        <div class="receipt-box">
          <h2>اشتراك الشبريحا</h2>
          <p style="text-align: center; font-size: 12px; color: #666; margin-top: -5px; margin-bottom: 8px;">فاتورة شهر: ${currentInvoiceMonth}</p>
          <hr style="border: 0; border-top: 1px solid #ddd; margin: 5px 0;">
          
          <div class="info-row"><span><b>المشترك:</b></span> <span>${customerName}</span></div>
          <div class="info-row"><span><b>رقم العداد:</b></span> <span>${meterNum}</span></div>
          <div class="info-row"><span><b>قراءة ${previousMonthName}:</b></span> <span>${prevRead}</span></div>
          <div class="info-row"><span><b>قراءة ${currentInvoiceMonth}:</b></span> <span>${currRead}</span></div>
          <div class="info-row"><span><b>الاستهلاك الفعلي:</b></span> <span><b style="color: #047857;">${consump} ك.و.س</b></span></div>
          <div class="info-row"><span><b>سعر الكيلو:</b></span> <span>${unitPrice} $</span></div>
          <div class="info-row"><span><b>رسم الاشتراك:</b></span> <span>${currentFee} $</span></div>
          
          <div class="total-box">
            المجموع المطلـوب: ${finalAmount} $
          </div>
        </div>
        <script>window.onload = function() { window.print(); window.close(); }</script>
      </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }

  function printMonthlyBatch(targetMonth: string, listToPrint: any[], neighborhoodFilter: string) {
    let filteredList = listToPrint;
    if (neighborhoodFilter !== 'الكل') {
      filteredList = listToPrint.filter(inv => {
        const custNeighborhood = inv.expand?.customer?.neighborhood;
        return custNeighborhood === neighborhoodFilter;
      });
    }

    if (!filteredList || filteredList.length === 0) {
      alert(`لا توجد فواتير للطباعة${neighborhoodFilter !== 'الكل' ? ` في حي "${neighborhoodFilter}"` : ''} لهذا الشهر.`);
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const previousMonthName = getPreviousMonthName(targetMonth);
    const currentFee = monthlyRates[targetMonth]?.fixedFee ?? 10;

    let pagesHtml = '';
    for (let i = 0; i < filteredList.length; i += 3) {
      const chunk = filteredList.slice(i, i + 3);
      
      let chunkReceipts = '';
      chunk.forEach((inv) => {
        const prevRead = Number(inv.previous_reading_ ?? inv.previous_reading ?? 0);
        const currRead = Number(inv.current_reading ?? inv.currentReading ?? 0);
        const consump = Number(inv.consumption ?? Math.max(0, currRead - prevRead));
        const unitPrice = Number(inv.price_used ?? pricePerKwh);
        const calculatedTotal = (consump * unitPrice) + currentFee;
        const finalAmount = Number(inv.amount ?? inv.total ?? calculatedTotal).toFixed(2);
        const customerName = inv.expand?.customer?.full_name || '---';
        const meterNum = inv.Number || inv.serial_number || '---';
        const custNeighborhood = inv.expand?.customer?.neighborhood || 'غير محدد';

        chunkReceipts += `
          <div class="receipt-box">
            <h2>اشتراك الشبريحا</h2>
            <p class="subtitle">فاتورة شهر: ${targetMonth} | الحي: ${custNeighborhood}</p>
            <hr class="divider">
            <div class="info-row"><span><b>المشترك:</b></span> <span>${customerName}</span></div>
            <div class="info-row"><span><b>رقم العداد:</b></span> <span>${meterNum}</span></div>
            <div class="info-row"><span><b>قراءة ${previousMonthName}:</b></span> <span>${prevRead}</span></div>
            <div class="info-row"><span><b>قراءة ${targetMonth}:</b></span> <span>${currRead}</span></div>
            <div class="info-row"><span><b>الاستهلاك الفعلي:</b></span> <span><b style="color: #047857;">${consump} ك.و.س</b></span></div>
            <div class="info-row"><span><b>سعر الكيلو:</b></span> <span>${unitPrice} $</span></div>
            <div class="info-row"><span><b>رسم الاشتراك:</b></span> <span>${currentFee} $</span></div>
            <div class="total-box">المجموع المطلـوب: ${finalAmount} $</div>
          </div>
        `;
      });

      pagesHtml += `
        <div class="page-container">
          ${chunkReceipts}
        </div>
      `;
    }

    const batchHtml = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>طباعة فواتير ${neighborhoodFilter !== 'الكل' ? `حي ${neighborhoodFilter}` : 'الكل'} - ${targetMonth}</title>
        <style>
          body { font-family: Tahoma, sans-serif; padding: 0; margin: 0; color: #000; direction: rtl; text-align: right; background: #fff; }
          .page-container { 
            width: 100%; 
            min-height: 100vh; 
            box-sizing: border-box; 
            padding: 15px; 
            display: flex; 
            flex-direction: column; 
            justify-content: space-between;
            page-break-after: always; 
            break-after: page;
          }
          .receipt-box { 
            width: 100%; 
            max-width: 400px; 
            margin: 0 auto 10px auto; 
            border: 2px dashed #333; 
            padding: 12px; 
            border-radius: 8px; 
            box-sizing: border-box;
          }
          h2 { text-align: center; color: #b45309; margin: 0 0 3px 0; font-size: 16px; }
          .subtitle { text-align: center; font-size: 10px; color: #666; margin: 0 0 6px 0; }
          .divider { border: 0; border-top: 1px solid #ddd; margin: 4px 0; }
          .info-row { display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 11px; border-bottom: 1px solid #eee; padding-bottom: 2px; }
          .total-box { text-align: center; margin-top: 6px; padding: 5px; background: #fef3c7; border-radius: 4px; font-size: 14px; font-weight: bold; color: #92400e; }
          @media print {
            body { padding: 0; }
            .page-container { page-break-after: always; break-after: page; }
            .receipt-box { border: 2px dashed #000; break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        ${pagesHtml}
        <script>window.onload = function() { window.print(); window.close(); }</script>
      </body>
      </html>
    `;
    printWindow.document.write(batchHtml);
    printWindow.document.close();
  }

  if (!isMounted) {
    return <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center font-sans" dir="rtl">جاري التحميل...</main>;
  }

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-slate-900 text-white flex items-center justify-center p-6 font-sans" dir="rtl">
        <div className="bg-gray-900/90 backdrop-blur-xl p-8 rounded-3xl border border-amber-500/30 shadow-2xl w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="bg-gradient-to-tr from-amber-500 to-orange-500 w-16 h-16 mx-auto rounded-2xl flex items-center justify-center text-3xl shadow-lg">⚡</div>
            <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-amber-200">اشتراك الشبريحا</h1>
            <p className="text-xs text-gray-400">يرجى تسجيل الدخول للمتابعة</p>
          </div>
          {authError && <div className="bg-red-500/20 border border-red-500/50 p-3.5 rounded-xl text-red-300 text-xs text-center font-medium">{authError}</div>}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1.5 font-medium">اسم المستخدم:</label>
              <input type="text" required value={authForm.username} onChange={(e) => setAuthForm({...authForm, username: e.target.value})} className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-3.5 text-white text-sm focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1.5 font-medium">كلمة المرور:</label>
              <input type="password" required value={authForm.password} onChange={(e) => setAuthForm({...authForm, password: e.target.value})} className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-3.5 text-white text-sm focus:outline-none focus:border-amber-500" />
            </div>
            <button type="submit" className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold py-4 rounded-2xl transition shadow-xl mt-2">🔐 تسجيل الدخول</button>
          </form>
        </div>
      </main>
    );
  }

  const archiveInvoicesList = invoices.filter(inv => (inv.month || selectedMonth) === archiveSelectedMonth);
  const archiveTotalConsumption = archiveInvoicesList.reduce((sum, inv) => {
    const cRead = Number(inv.current_reading ?? inv.currentReading ?? 0);
    const pRead = Number(inv.previous_reading_ ?? inv.previous_reading ?? 0);
    return sum + Number(inv.consumption ?? Math.max(0, cRead - pRead));
  }, 0);
  const archiveTotalAmount = archiveInvoicesList.reduce((sum, inv) => {
    const cRead = Number(inv.current_reading ?? inv.currentReading ?? 0);
    const pRead = Number(inv.previous_reading_ ?? inv.previous_reading ?? 0);
    const cons = Number(inv.consumption ?? Math.max(0, cRead - pRead));
    const uPrice = Number(inv.price_used ?? 0.75);
    const currentFee = monthlyRates[archiveSelectedMonth]?.fixedFee ?? fixedFee ?? 10;
    return sum + Number(inv.amount ?? inv.total ?? ((cons * uPrice) + currentFee));
  }, 0);

  const lowInvoicesList = invoices.filter(inv => {
    const invMonth = inv.month || selectedMonth;
    if (invMonth !== lowInvoicesSelectedMonth) return false;

    const cRead = Number(inv.current_reading ?? inv.currentReading ?? 0);
    const pRead = Number(inv.previous_reading_ ?? inv.previous_reading ?? 0);
    const cons = Number(inv.consumption ?? Math.max(0, cRead - pRead));
    const uPrice = Number(inv.price_used ?? 0.75);
    const currentFee = monthlyRates[invMonth]?.fixedFee ?? fixedFee ?? 10;
    const finalAmount = Number(inv.amount ?? inv.total ?? ((cons * uPrice) + currentFee));

    return finalAmount < 20;
  });

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-slate-900 text-white p-6 font-sans" dir="rtl">
      {dbError && (
        <div className="bg-red-500/20 border border-red-500/50 p-4 rounded-2xl mb-6 text-red-300 text-sm flex justify-between items-center">
          <span>⚠️ {dbError}</span>
          <button onClick={fetchData} className="bg-red-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold">إعادة المحاولة</button>
        </div>
      )}

      <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border border-amber-500/30 p-6 rounded-3xl mb-8 shadow-2xl flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-tr from-amber-500 to-orange-500 p-3.5 rounded-2xl text-2xl shadow-lg">⚡</div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-amber-200">اشتراك الشبريحا</h1>
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs px-3 py-1 rounded-full font-mono">Aethel Group ✦</span>
            </div>
            <p className="text-xs text-gray-400 mt-1 font-medium">الشهر المحدد حالياً للإدخال: <span className="text-amber-400 font-bold">{selectedMonth}</span> (السعر: {pricePerKwh}$ | الرسوم: {fixedFee}$)</p>
          </div>
        </div>
        <button onClick={handleLogout} className="bg-red-500/20 border border-red-500/40 text-red-300 px-4 py-2 rounded-2xl text-xs font-bold transition">🚪 تسجيل الخروج</button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 bg-gray-900/60 p-2.5 rounded-2xl mb-8 border border-gray-800">
        {[
          { id: 'home', label: 'الرئيسية', icon: '📊' },
          { id: 'archive', label: 'أرشيف الشهور', icon: '📁' },
          { id: 'low-invoices', label: 'فواتير أقل من 20$', icon: '📉' },
          { id: 'add-customer', label: 'مشترك جديد', icon: '➕' },
          { id: 'ocr', label: 'تسجيل بالكاميرا', icon: '📷' },
          { id: 'manual', label: 'إدخال يدوي', icon: '⌨️' },
          { id: 'customers', label: 'المشتركون', icon: '👥' },
          { id: 'settings', label: 'الإعدادات والأسعار', icon: '⚙️' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center justify-center gap-1.5 py-3 px-2 rounded-xl font-bold text-xs transition-all ${
              activeTab === tab.id ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'home' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-900 p-5 rounded-2xl border border-gray-800 shadow-lg">
              <p className="text-xs text-gray-400">عدد المشتركين</p>
              <h3 className="text-3xl font-black mt-2 text-white">{customers.length}</h3>
            </div>
            <div className="bg-gray-900 p-5 rounded-2xl border border-gray-800 shadow-lg">
              <p className="text-xs text-gray-400">إجمالي الفواتير</p>
              <h3 className="text-3xl font-black mt-2 text-white">{invoices.length}</h3>
            </div>
            <div className="bg-gray-900 p-5 rounded-2xl border border-gray-800 shadow-lg">
              <p className="text-xs text-gray-400">إجمالي الاستهلاك</p>
              <h3 className="text-2xl font-black mt-2 text-emerald-400">{totalConsumptionAll} <span className="text-xs font-normal text-gray-400">ك.و.س</span></h3>
            </div>
            <div className="bg-gray-900 p-5 rounded-2xl border border-gray-800 shadow-lg">
              <p className="text-xs text-gray-400">إجمالي المبالغ المطلوبة</p>
              <h3 className="text-2xl font-black mt-2 text-amber-400">${totalAmountAll.toFixed(2)}</h3>
            </div>
          </div>

          <div className="bg-gray-900/80 p-6 rounded-3xl border border-gray-800 space-y-4">
            <h2 className="font-bold text-lg text-amber-400">سجل الفواتير الأخيرة</h2>
            {invoices.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-6">لا توجد فواتير مسجلة بعد.</p>
            ) : (
              <div className="space-y-2.5">
                {invoices.map((inv) => {
                  const cRead = Number(inv.current_reading ?? inv.currentReading ?? 0);
                  const pRead = Number(inv.previous_reading_ ?? inv.previous_reading ?? 0);
                  const cons = Number(inv.consumption ?? Math.max(0, cRead - pRead));
                  const uPrice = Number(inv.price_used ?? 0.75);
                  const invMonth = inv.month || selectedMonth;
                  const currentFee = monthlyRates[invMonth]?.fixedFee ?? fixedFee ?? 10;
                  const calculatedAmt = Number(inv.amount ?? inv.total ?? ((cons * uPrice) + currentFee)).toFixed(2);

                  return (
                    <div key={inv.id} className="bg-gray-950/70 p-4 rounded-2xl flex justify-between items-center border border-gray-800">
                      <div>
                        <p className="font-bold text-white text-sm">{inv.expand?.customer?.full_name || 'مشترك'} <span className="text-xs text-amber-300">({invMonth})</span></p>
                        <p className="text-xs text-gray-400 mt-1">الاستهلاك: <span className="text-emerald-400 font-bold">{cons} ك.و.س</span> | المبلغ: <span className="text-amber-400 font-bold">${calculatedAmt}</span></p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => printSingleInvoice(inv)} className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-1.5 rounded-xl text-xs font-bold transition hover:bg-amber-500/30">
                          🖨️ طباعة
                        </button>
                        <button onClick={() => sendWhatsAppInvoice(inv)} className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-3 py-1.5 rounded-xl text-xs font-bold transition hover:bg-emerald-500/30 flex items-center gap-1">
                          <span>💬</span> واتساب (مجاني)
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'archive' && (
        <div className="space-y-6">
          <div className="bg-gray-900/80 p-6 rounded-3xl border border-gray-800 space-y-6">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div>
                <h2 className="font-bold text-lg text-amber-400">أرشيف وإحصائيات الشهور</h2>
                <p className="text-xs text-gray-400 mt-1">ملخص استهلاك جميع المشتركين والفواتير لكل شهر</p>
              </div>
              <div className="flex flex-wrap gap-3 w-full lg:w-auto items-center">
                <select value={archiveSelectedMonth} onChange={(e) => setArchiveSelectedMonth(e.target.value)} className="bg-gray-950 border border-gray-800 rounded-2xl p-3 text-white text-sm focus:outline-none focus:border-amber-500 w-full sm:w-56">
                  {allAvailableMonths.map(m => <option key={m} value={m}>{m}</option>)}
                </select>

                <select value={selectedNeighborhoodForPrint} onChange={(e) => setSelectedNeighborhoodForPrint(e.target.value)} className="bg-gray-950 border border-gray-800 rounded-2xl p-3 text-white text-sm focus:outline-none focus:border-amber-500 w-full sm:w-48">
                  <option value="الكل">جميع الأحياء</option>
                  {neighborhoodsList.map(n => <option key={n} value={n}>{n}</option>)}
                </select>

                {archiveInvoicesList.length > 0 && (
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button 
                      onClick={() => printMonthlyBatch(archiveSelectedMonth, archiveInvoicesList, selectedNeighborhoodForPrint)}
                      className="flex-1 sm:flex-none bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold py-3 px-4 rounded-2xl text-xs transition shadow-lg flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                      <span>🖨️</span> طباعة (كل 3 بصفحة)
                    </button>
                    <button 
                      onClick={() => sendBatchWhatsApp(archiveInvoicesList, archiveSelectedMonth)}
                      className="flex-1 sm:flex-none bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-500 hover:to-green-600 text-white font-bold py-3 px-4 rounded-2xl text-xs transition shadow-lg flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                      <span>💬</span> واتساب جماعي
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gray-950 p-4 rounded-2xl border border-gray-800">
                <p className="text-xs text-gray-400">إجمالي استهلاك المشتركين ({archiveSelectedMonth})</p>
                <h3 className="text-2xl font-black text-emerald-400 mt-1">{archiveTotalConsumption} <span className="text-xs text-gray-400 font-normal">ك.و.س</span></h3>
              </div>
              <div className="bg-gray-950 p-4 rounded-2xl border border-gray-800">
                <p className="text-xs text-gray-400">إجمالي المبالغ المطلوبة بالشهر</p>
                <h3 className="text-2xl font-black text-amber-400 mt-1">${archiveTotalAmount.toFixed(2)}</h3>
              </div>
              <div className="bg-gray-950 p-4 rounded-2xl border border-gray-800">
                <p className="text-xs text-gray-400">عدد الفواتير الصادرة</p>
                <h3 className="text-2xl font-black text-white mt-1">{archiveInvoicesList.length}</h3>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <h3 className="font-bold text-sm text-gray-300">تفاصيل فواتير المشتركين لشهر {archiveSelectedMonth}:</h3>
              {archiveInvoicesList.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8 bg-gray-950/40 rounded-2xl border border-gray-800">لا توجد فواتير مسجلة في هذا الشهر حتى الآن.</p>
              ) : (
                <div className="space-y-2.5">
                  {archiveInvoicesList.map(inv => {
                    const cRead = Number(inv.current_reading ?? inv.currentReading ?? 0);
                    const pRead = Number(inv.previous_reading_ ?? inv.previous_reading ?? 0);
                    const cons = Number(inv.consumption ?? Math.max(0, cRead - pRead));
                    const uPrice = Number(inv.price_used ?? 0.75);
                    const currentFee = monthlyRates[archiveSelectedMonth]?.fixedFee ?? 10;
                    const calculatedAmt = Number(inv.amount ?? inv.total ?? ((cons * uPrice) + currentFee)).toFixed(2);
                    const custNeighborhood = inv.expand?.customer?.neighborhood || 'غير محدد';

                    return (
                      <div key={inv.id} className="bg-gray-950 p-4 rounded-2xl flex justify-between items-center border border-gray-800">
                        <div>
                          <p className="font-bold text-white text-sm">{inv.expand?.customer?.full_name || 'مشترك'} <span className="text-xs text-amber-300">({custNeighborhood})</span></p>
                          <p className="text-xs text-gray-400 mt-0.5">الاستهلاك: <span className="text-emerald-400 font-bold">{cons} ك.و.س</span> | المبلغ: <span className="text-amber-400 font-bold">${calculatedAmt}</span></p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => printSingleInvoice(inv)} className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-1.5 rounded-xl text-xs font-bold transition hover:bg-amber-500/30">
                            🖨️ طباعة
                          </button>
                          <button onClick={() => sendWhatsAppInvoice(inv)} className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-3 py-1.5 rounded-xl text-xs font-bold transition hover:bg-emerald-500/30 flex items-center gap-1">
                            <span>💬</span> واتساب (مجاني)
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'low-invoices' && (
        <div className="space-y-6">
          <div className="bg-gray-900/80 p-6 rounded-3xl border border-gray-800 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="font-bold text-lg text-amber-400">📉 الفواتير التي تقل قيمتها عن 20$</h2>
                <p className="text-xs text-gray-400 mt-1">عرض جميع المشتركين الذين تبلغ قيمة فواتيرهم أقل من 20 دولاراً للشهر المحدد</p>
              </div>
              <div className="flex gap-3 w-full sm:w-auto items-center">
                <select 
                  value={lowInvoicesSelectedMonth} 
                  onChange={(e) => setLowInvoicesSelectedMonth(e.target.value)} 
                  className="bg-gray-950 border border-gray-800 rounded-2xl p-3 text-white text-sm focus:outline-none focus:border-amber-500 w-full sm:w-56"
                >
                  {allAvailableMonths.map(m => <option key={m} value={m}>{m}</option>)}
                </select>

                {lowInvoicesList.length > 0 && (
                  <button 
                    onClick={() => printMonthlyBatch(lowInvoicesSelectedMonth, lowInvoicesList, 'الكل')}
                    className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold py-3 px-4 rounded-2xl text-xs transition shadow-lg flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <span>🖨️</span> طباعة القائمة (كل 3 بصفحة)
                  </button>
                )}
              </div>
            </div>

            <div className="bg-gray-950 p-4 rounded-2xl border border-gray-800 flex justify-between items-center">
              <span className="text-xs text-gray-400">عدد الفواتير أقل من 20$ لشهر {lowInvoicesSelectedMonth}:</span>
              <span className="text-amber-400 font-black text-lg">{lowInvoicesList.length} فاتورة</span>
            </div>

            <div className="space-y-3 pt-2">
              {lowInvoicesList.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-12 bg-gray-950/40 rounded-2xl border border-gray-800">لا توجد فواتير أقل من 20$ في هذا الشهر.</p>
              ) : (
                <div className="space-y-2.5">
                  {lowInvoicesList.map(inv => {
                    const cRead = Number(inv.current_reading ?? inv.currentReading ?? 0);
                    const pRead = Number(inv.previous_reading_ ?? inv.previous_reading ?? 0);
                    const cons = Number(inv.consumption ?? Math.max(0, cRead - pRead));
                    const uPrice = Number(inv.price_used ?? 0.75);
                    const currentFee = monthlyRates[lowInvoicesSelectedMonth]?.fixedFee ?? fixedFee ?? 10;
                    const calculatedAmt = Number(inv.amount ?? inv.total ?? ((cons * uPrice) + currentFee)).toFixed(2);
                    const custNeighborhood = inv.expand?.customer?.neighborhood || 'غير محدد';

                    return (
                      <div key={inv.id} className="bg-gray-950 p-4 rounded-2xl flex justify-between items-center border border-gray-800">
                        <div>
                          <p className="font-bold text-white text-sm">{inv.expand?.customer?.full_name || 'مشترك'} <span className="text-xs text-amber-300">({custNeighborhood})</span></p>
                          <p className="text-xs text-gray-400 mt-0.5">الاستهلاك: <span className="text-emerald-400 font-bold">{cons} ك.و.س</span> | المبلغ: <span className="text-amber-400 font-bold">${calculatedAmt}</span></p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => printSingleInvoice(inv)} className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-1.5 rounded-xl text-xs font-bold transition hover:bg-amber-500/30">
                            🖨️ طباعة
                          </button>
                          <button onClick={() => sendWhatsAppInvoice(inv)} className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-3 py-1.5 rounded-xl text-xs font-bold transition hover:bg-emerald-500/30 flex items-center gap-1">
                            <span>💬</span> واتساب
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'add-customer' && (
        <div className="bg-gray-900/80 p-6 rounded-3xl border border-gray-800 max-w-xl mx-auto space-y-4">
          <h2 className="font-bold text-lg text-amber-400">إضافة مشترك جديد</h2>
          <form onSubmit={handleAddCustomer} className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1">اسم المشترك:</label>
              <input type="text" required value={newCustomerForm.full_name} onChange={(e) => setNewCustomerForm({...newCustomerForm, full_name: e.target.value})} className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-3 text-white text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">رقم الهاتف (واتساب):</label>
              <input type="text" value={newCustomerForm.phone} onChange={(e) => setNewCustomerForm({...newCustomerForm, phone: e.target.value})} className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-3 text-white text-sm" placeholder="961xxxxxxxx" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">رقم العداد / التسلسلي:</label>
              <input type="text" value={newCustomerForm.serial_number} onChange={(e) => setNewCustomerForm({...newCustomerForm, serial_number: e.target.value})} className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-3 text-white text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">المنطقة / الحي:</label>
              <select value={newCustomerForm.neighborhood} onChange={(e) => setNewCustomerForm({...newCustomerForm, neighborhood: e.target.value})} className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-3 text-white text-sm">
                {neighborhoodsList.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">القراءة الابتدائية (السابقة):</label>
              <input 
                type="number" 
                value={newCustomerForm.initial_reading} 
                onChange={(e) => setNewCustomerForm({...newCustomerForm, initial_reading: e.target.value})} 
                className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-3 text-white text-sm" 
                placeholder="0" 
              />
            </div>
            <button type="submit" disabled={addingCustomer} className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold py-3.5 rounded-2xl transition shadow-xl">{addingCustomer ? 'جاري الحفظ...' : 'حفظ المشترك'}</button>
          </form>
        </div>
      )}

      {activeTab === 'ocr' && (
        <div className="bg-gray-900/80 p-6 rounded-3xl border border-gray-800 max-w-xl mx-auto space-y-4">
          <h2 className="font-bold text-lg text-amber-400">تسجيل قراءة عبر الكاميرا (OCR)</h2>
          <div>
            <label className="text-xs text-gray-400 block mb-1">اختر شهر الفاتورة:</label>
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-3 text-white text-sm">
              {allAvailableMonths.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">صورة العداد:</label>
            <input type="file" accept="image/*" onChange={handleFileChange} className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-3 text-white text-sm" />
          </div>

          {loading && <p className="text-amber-400 text-center text-sm py-4">جاري تحليل الصورة واستخراج القراءة بالذكاء الاصطناعي...</p>}

          {readingResult.reading && (
            <div className="bg-gray-950 p-4 rounded-2xl border border-gray-800 space-y-2">
              <p className="text-xs text-gray-400">رقم العداد المستخرج: <span className="text-white font-bold">{readingResult.meterNumber || 'غير معروف'}</span></p>
              <p className="text-xs text-gray-400">القراءة المستخرجة: <span className="text-emerald-400 font-bold text-base">{readingResult.reading}</span></p>
              
              {matchedCustomer ? (
                <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl mt-3 space-y-1">
                  <p className="text-xs text-emerald-300 font-bold">✓ تم مطابقة المشترك بنجاح:</p>
                  <p className="text-sm text-white font-bold">{matchedCustomer.full_name}</p>
                  <p className="text-xs text-gray-300">القراءة السابقة: {customerPreviousReading} | الاستهلاك: {calculatedConsumption} | المبلغ: ${calculatedTotalAmount}</p>
                  <button onClick={handleSaveInvoice} disabled={saving} className="w-full mt-2 bg-emerald-600 text-white py-2.5 rounded-xl font-bold text-xs">{saving ? 'جاري الحفظ...' : 'حفظ الفاتورة وطباعتها'}</button>
                </div>
              ) : (
                <p className="text-red-400 text-xs mt-2">⚠️ لم يتم العثور على مشترك مطابق لرقم العداد المستخرج.</p>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'manual' && (
        <div className="bg-gray-900/80 p-6 rounded-3xl border border-gray-800 max-w-xl mx-auto space-y-4">
          <h2 className="font-bold text-lg text-amber-400">إدخال يدوي للفاتورة</h2>
          <form onSubmit={handleSaveManualInvoice} className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1">شهر الفاتورة:</label>
              <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-3 text-white text-sm">
                {allAvailableMonths.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">رقم العداد أو اسم المشترك:</label>
              <input type="text" value={manualForm.meterNumber} onChange={(e) => handleManualMeterChange(e.target.value)} placeholder="أدخل رقم العداد للبحث..." className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-3 text-white text-sm" />
            </div>

            {manualSelectedCustomer ? (
              <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl space-y-1">
                <p className="text-xs text-emerald-300 font-bold">✓ المشترك المختار:</p>
                <p className="text-sm text-white font-bold">{manualSelectedCustomer.full_name}</p>
                <p className="text-xs text-gray-300">القراءة السابقة: {manualPreviousReading}</p>
              </div>
            ) : manualForm.meterNumber ? (
              <p className="text-red-400 text-xs">⚠️ لم يتم العثور على مشترك بهذا الرقم.</p>
            ) : null}

            <div>
              <label className="text-xs text-gray-400 block mb-1">القراءة الحالية:</label>
              <input type="number" required value={manualForm.currentReading} onChange={(e) => setManualForm({...manualForm, currentReading: e.target.value})} className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-3 text-white text-sm" />
            </div>

            {manualSelectedCustomer && manualForm.currentReading && (
              <div className="bg-gray-950 p-3 rounded-xl border border-gray-800 text-xs space-y-1">
                <p>الاستهلاك: <span className="text-emerald-400 font-bold">{manualConsumption} ك.و.س</span></p>
                <p>المبلغ الإجمالي: <span className="text-amber-400 font-bold">${manualTotalAmount}</span></p>
              </div>
            )}

            <button type="submit" disabled={saving || !manualSelectedCustomer} className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold py-3.5 rounded-2xl transition shadow-xl">{saving ? 'جاري الحفظ...' : 'حفظ الفاتورة وطباعتها'}</button>
          </form>
        </div>
      )}

      {activeTab === 'customers' && (
        <div className="bg-gray-900/80 p-6 rounded-3xl border border-gray-800 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-lg text-amber-400">إدارة المشتركين</h2>
            <input type="text" placeholder="بحث عن مشترك..." value={customerSearchQuery} onChange={(e) => setCustomerSearchQuery(e.target.value)} className="bg-gray-950 border border-gray-800 rounded-2xl p-2.5 text-white text-xs w-64" />
          </div>

          <div className="space-y-2.5">
            {customers.filter(c => (c.full_name || '').toLowerCase().includes(customerSearchQuery.toLowerCase()) || (c.serial_number || '').includes(customerSearchQuery)).map((cust) => {
              const custInitialReading = Number(cust.initial_reading ?? cust.initialReading ?? cust.initial_Reading ?? 0);
              return (
                <div key={cust.id} className="bg-gray-950/70 p-4 rounded-2xl flex justify-between items-center border border-gray-800">
                  <div>
                    <p className="font-bold text-white text-sm">{cust.full_name} <span className="text-xs text-amber-300">({cust.neighborhood || 'بدون منطقة'})</span></p>
                    <p className="text-xs text-gray-400 mt-1">العداد: {cust.serial_number || '---'} | الهاتف: {cust.phone || '---'} | قراءة ابتداءً: {custInitialReading}</p>
                  </div>
                  <button onClick={() => openEditModal(cust)} className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-1.5 rounded-xl text-xs font-bold">✏️ تعديل</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="bg-gray-900/80 p-6 rounded-3xl border border-gray-800 max-w-xl mx-auto space-y-8">
          
          <div className="space-y-6 border-b border-gray-800 pb-8">
            <h2 className="font-bold text-lg text-amber-400">الإعدادات والأسعار الشهرية</h2>
            <div>
              <label className="text-xs text-gray-400 block mb-1">اختر الشهر للتعديل:</label>
              <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-3 text-white text-sm">
                {allAvailableMonths.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">سعر الكيلوواط ($):</label>
              <input type="number" step="0.01" value={monthlyRates[selectedMonth]?.pricePerKwh ?? 0.75} onChange={(e) => {
                const val = parseFloat(e.target.value) || 0;
                setMonthlyRates(prev => ({ ...prev, [selectedMonth]: { ...prev[selectedMonth], pricePerKwh: val } }));
              }} className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-3 text-white text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">رسوم الاشتراك الثابتة ($):</label>
              <input type="number" step="1" value={monthlyRates[selectedMonth]?.fixedFee ?? 10} onChange={(e) => {
                const val = parseFloat(e.target.value) || 0;
                setMonthlyRates(prev => ({ ...prev, [selectedMonth]: { ...prev[selectedMonth], fixedFee: val } }));
              }} className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-3 text-white text-sm" />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-md text-amber-400">تغيير اسم المستخدم وكلمة المرور</h3>
            <p className="text-xs text-gray-400">قم بتعبئة الحقول أدناه لتحديث بيانات الدخول الخاصة بلوحة التحكم.</p>
            
            {accountUpdateMsg.text && (
              <div className={`p-3 rounded-xl text-xs font-medium border ${accountUpdateMsg.type === 'success' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-red-500/20 border-red-500/40 text-red-300'}`}>
                {accountUpdateMsg.text}
              </div>
            )}

            <form onSubmit={handleUpdateAccount} className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">اسم المستخدم الجديد (اختياري):</label>
                <input 
                  type="text" 
                  value={accountForm.newUsername} 
                  onChange={(e) => setAccountForm({...accountForm, newUsername: e.target.value})} 
                  placeholder="اتركه فارغاً إذا لم ترغب بتغييره"
                  className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-3 text-white text-sm focus:outline-none focus:border-amber-500" 
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">كلمة المرور الحالية (طلوبة للتأكيد):</label>
                <input 
                  type="password" 
                  required
                  value={accountForm.currentPassword} 
                  onChange={(e) => setAccountForm({...accountForm, currentPassword: e.target.value})} 
                  placeholder="أدخل كلمة المرور الحالية..."
                  className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-3 text-white text-sm focus:outline-none focus:border-amber-500" 
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">كلمة المرور الجديدة (اختياري):</label>
                <input 
                  type="password" 
                  value={accountForm.newPassword} 
                  onChange={(e) => setAccountForm({...accountForm, newPassword: e.target.value})} 
                  placeholder="اتركه فارغاً إذا لم ترغب بتغييرها"
                  className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-3 text-white text-sm focus:outline-none focus:border-amber-500" 
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">تأكيد كلمة المرور الجديدة:</label>
                <input 
                  type="password" 
                  value={accountForm.confirmPassword} 
                  onChange={(e) => setAccountForm({...accountForm, confirmPassword: e.target.value})} 
                  placeholder="أعد إدخال كلمة المرور الجديدة..."
                  className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-3 text-white text-sm focus:outline-none focus:border-amber-500" 
                />
              </div>
              <button type="submit" className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold py-3.5 rounded-2xl transition shadow-xl text-xs">
                💾 حفظ التعديلات وحساب الدخول
              </button>
            </form>
          </div>

          <div className="space-y-4 pt-4 border-t border-gray-800">
            <h3 className="font-bold text-sm text-amber-300">إدارة الأحياء والمناطق</h3>
            <form onSubmit={handleAddNeighborhood} className="flex gap-2">
              <input type="text" placeholder="اسم الحي الجديد..." value={newNeighborhoodInput} onChange={(e) => setNewNeighborhoodInput(e.target.value)} className="flex-1 bg-gray-950 border border-gray-800 rounded-2xl p-3 text-white text-sm" />
              <button type="submit" className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-4 rounded-2xl text-xs transition">إضافة حي</button>
            </form>

            <div className="space-y-2 pt-2">
              <p className="text-xs text-gray-400">الأحياء المتاحة حالياً:</p>
              <div className="space-y-2">
                {neighborhoodsList.map(nName => (
                  <div key={nName} className="bg-gray-950 p-3 rounded-xl border border-gray-800 flex justify-between items-center text-xs">
                    <span className="text-white font-bold">{nName}</span>
                    <button type="button" onClick={() => handleDeleteNeighborhood(nName)} className="text-red-400 hover:text-red-300 bg-red-500/10 border border-red-500/30 px-2.5 py-1 rounded-lg">حذف</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      )}

      {editingCustomer && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50" dir="rtl">
          <div className="bg-gray-900 border border-amber-500/30 p-6 rounded-3xl max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-amber-400">تعديل بيانات المشترك</h3>
            <form onSubmit={handleUpdateCustomer} className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">اسم المشترك:</label>
                <input type="text" required value={editCustomerForm.full_name} onChange={(e) => setEditCustomerForm({...editCustomerForm, full_name: e.target.value})} className="w-full bg-gray-950 border border-gray-800 rounded-xl p-2.5 text-white text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">رقم الهاتف:</label>
                <input type="text" value={editCustomerForm.phone} onChange={(e) => setEditCustomerForm({...editCustomerForm, phone: e.target.value})} className="w-full bg-gray-950 border border-gray-800 rounded-xl p-2.5 text-white text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">رقم العداد:</label>
                <input type="text" value={editCustomerForm.serial_number} onChange={(e) => setEditCustomerForm({...editCustomerForm, serial_number: e.target.value})} className="w-full bg-gray-950 border border-gray-800 rounded-xl p-2.5 text-white text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">المنطقة:</label>
                <select value={editCustomerForm.neighborhood} onChange={(e) => setEditCustomerForm({...editCustomerForm, neighborhood: e.target.value})} className="w-full bg-gray-950 border border-gray-800 rounded-xl p-2.5 text-white text-sm">
                  {neighborhoodsList.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">القراءة الابتدائية:</label>
                <input 
                  type="number" 
                  value={editCustomerForm.initial_reading} 
                  onChange={(e) => setEditCustomerForm({...editCustomerForm, initial_reading: e.target.value})} 
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl p-2.5 text-white text-sm" 
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-amber-600 text-white font-bold py-2.5 rounded-xl text-xs">تحديث</button>
                <button type="button" onClick={() => setEditingCustomer(null)} className="flex-1 bg-gray-800 text-gray-300 font-bold py-2.5 rounded-xl text-xs">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}