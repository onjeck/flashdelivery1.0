
import { Order } from '../types';

// Número fictício da Central
export const CENTRAL_SUPPORT_PHONE = '11999990000';

export const openWhatsApp = (phone: string | undefined, message: string) => {
  if (!phone) {
    alert('Telefone não disponível para este contato.');
    return;
  }
  
  // Limpa o telefone (remove caracteres não numéricos)
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Adiciona o código do país se não tiver (Assumindo Brasil 55)
  const fullPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;

  const encodedMessage = encodeURIComponent(message);
  const url = `https://wa.me/${fullPhone}?text=${encodedMessage}`;
  
  window.open(url, '_blank');
};

export const WhatsAppTemplates = {
  // Central falando com Motoboy
  adminToDriver: (driverName: string, orderId: string) => 
    `Olá ${driverName}, preciso falar sobre a entrega #${orderId.slice(-4)}.`,

  // Central falando com Cliente
  adminToClient: (clientName: string, orderId: string) => 
    `Olá ${clientName}, somos da FlashDelivery. Sobre seu pedido #${orderId.slice(-4)}...`,

  // Motoboy falando com Cliente
  driverToClient: (clientName: string, orderId: string) => 
    `Olá ${clientName}, sou o motoboy da sua entrega #${orderId.slice(-4)}. Estou a caminho!`,

  // Cliente falando com Motoboy
  clientToDriver: (driverName: string) => 
    `Olá ${driverName}, estou aguardando minha entrega.`,
  
  // Cliente/Motoboy falando com Suporte
  toSupport: (role: string, name: string) => 
    `Olá Central, sou o ${role} ${name} e preciso de ajuda.`
};
