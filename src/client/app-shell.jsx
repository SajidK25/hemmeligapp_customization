import { Link, Outlet } from 'react-router-dom';
import { AppShell, Anchor, Header, Footer, Text, useMantineTheme, Group } from '@mantine/core';

import { useMediaQuery } from '@mantine/hooks';
import { useTranslation } from 'react-i18next';

import HeaderContent from './components/header';

const ApplicationShell = () => {
    const { t } = useTranslation();
    const isMobile = useMediaQuery('(max-width: 768px)');
    const theme = useMantineTheme();
    const h3Style = {
        color: '#03c03c',
    };

    return (
        <AppShell
            styles={{
                main: {
                    background: theme.colors.dark[8],
                },
            }}
            navbarOffsetBreakpoint="sm"
            footer={
                <Footer
                    height={45}
                    p="xs"
                    sx={(theme) => ({
                        backgroundColor: theme.colors.dark[8],
                    })}
                >
                    <Text weight="bold" className="radial-text-gradient" align="center" size="h2">
                        Powered by OnionGangster®2k24
                    </Text>
                </Footer>
            }
            header={
                <Header
                    height={75}
                    style={{ zIndex: 100, padding: '0' }}
                    p="xs"
                    sx={(theme) => ({
                        backgroundColor: theme.colors.dark[8],
                    })}
                >
                    <HeaderContent />
                </Header>
            }
        >
            <Outlet />
        </AppShell>
    );
};

export default ApplicationShell;
