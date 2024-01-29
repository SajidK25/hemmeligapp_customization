import React, { useEffect, useState, useRef } from 'react';
import passwordGenerator from 'generate-password-browser';
import {
    Button,
    Checkbox,
    Container,
    TextInput,
    Select,
    CopyButton,
    ActionIcon,
    Tooltip,
    Group,
    Stack,
    Title,
    Text,
    Divider,
    FileButton,
    NumberInput,
    Badge,
    Box,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMediaQuery } from '@mantine/hooks';
import {
    IconSquarePlus,
    IconTrash,
    IconLock,
    IconLockAccess,
    IconLink,
    IconCopy,
    IconCheck,
    IconHeading,
    IconShare,
    IconShieldLock,
} from '@tabler/icons';
import { useSelector } from 'react-redux';
import Quill from '../../components/quill';
import QRLink from '../../components/qrlink';
import ErrorBox from '../../components/error-box';

import { zipFiles } from '../../helpers/zip';
import { createSecret, burnSecret } from '../../api/secret';
import { generateKey, encrypt } from '../../../shared/helpers/crypto';
import { useTranslation } from 'react-i18next';

import config from '../../config';

import style from './style.module.css';

const DEFAULT_TTL = 259200; // 3 days - 72 hours

const Home = () => {
    const form = useForm({
        initialValues: {
            text: '',
            title: '',
            maxViews: 1,
            files: [],
            password: '',
            ttl: DEFAULT_TTL,
            allowedIp: '',
            preventBurn: false,
        },
    });

    const [text, setText] = useState('');
    const [ttl, setTTL] = useState(DEFAULT_TTL);
    const [enablePassword, setOnEnablePassword] = useState(false);
    const [secretId, setSecretId] = useState('');
    const [encryptionKey, setEncryptionKey] = useState('');
    const [creatingSecret, setCreatingSecret] = useState(false);
    const [error, setError] = useState('');

    const secretRef = useRef(null);

    const isMobile = useMediaQuery('(max-width: 915px)');

    const isLoggedIn = useSelector((state) => state.isLoggedIn);

    const { t } = useTranslation();

    useEffect(() => {
        if (secretId) {
            secretRef.current.focus();
        }
    }, [secretId]);

    useEffect(() => {
        if (enablePassword) {
            form.setFieldValue(
                'password',
                passwordGenerator.generate({
                    length: 16,
                    numbers: true,
                    strict: true,
                    symbols: true,
                })
            );
        } else {
            form.setFieldValue('password', '');
        }
    }, [enablePassword]);

    const onTextChange = (value) => {
        setText(value);

        form.setFieldValue('text', value);
    };

    const onSelectChange = (value) => {
        form.setFieldValue('ttl', value);
        setTTL(value);
    };

    const onEnablePassword = () => {
        setOnEnablePassword(!enablePassword);
    };

    const reset = () => {
        form.reset();
        setSecretId('');
        form.clearErrors();
        setEncryptionKey('');
        setOnEnablePassword(false);
        setCreatingSecret(false);
        setText('');
        setTTL(DEFAULT_TTL);
        setError('');
    };

    const onSubmit = async (values) => {
        if (!form.values.text) {
            form.setErrors({ text: t('home.please_add_secret') });
            return;
        }

        const password = form.values.password;

        const publicEncryptionKey = generateKey(password);
        const encryptionKey = publicEncryptionKey + password;

        setCreatingSecret(true);

        const body = {
            text: encrypt(form.values.text, encryptionKey),
            files: [],
            title: encrypt(form.values.title, encryptionKey),
            password: form.values.password,
            ttl: form.values.ttl,
            allowedIp: form.values.allowedIp,
            preventBurn: form.values.preventBurn,
            maxViews: form.values.maxViews,
        };

        const zipFile = await zipFiles(form.values.files);

        if (zipFile) {
            body.files.push({
                type: 'application/zip',
                ext: '.zip',
                content: encrypt(zipFile, encryptionKey),
            });
        }

        const json = await createSecret(body);

        if (json.statusCode !== 201) {
            if (json.statusCode === 403) {
                setError(json.error);
            }

            if (json.message === 'request file too large, please check multipart config') {
                form.setErrors({ files: 'The file size is too large' });
            } else {
                form.setErrors({ files: json.error });
            }

            setCreatingSecret(false);

            return;
        }

        setSecretId(json.id);
        setEncryptionKey(publicEncryptionKey);
        form.clearErrors();
        setCreatingSecret(false);
    };

    const onNewSecret = async (event) => {
        event.preventDefault();

        reset();
    };

    const onBurn = async (event) => {
        if (!secretId) {
            return;
        }

        event.preventDefault();

        burnSecret(secretId);

        reset();
    };

    const onShare = (event) => {
        event.preventDefault();

        if (navigator.share) {
            navigator
                .share({
                    title: 'hemmelig.app',
                    text: t('home.get_your_secret'),
                    url: getSecretURL(),
                })
                .then(() => console.log(t('home.successful_share')))
                .catch(console.error);
        }
    };

    const removeFile = (index) => {
        const updatedFiles = [...form.values.files];
        updatedFiles.splice(index, 1);
        form.setFieldValue('files', updatedFiles);
    };

    const handleFocus = (event) => event.target.select();

    const getSecretURL = (withEncryptionKey = true) => {
        if (!withEncryptionKey) {
            return `${window.location.origin}/secret/${secretId}`;
        }

        return `${window.location.origin}/secret/${secretId}#encryption_key=${encryptionKey}`;
    };

    const inputReadOnly = !!secretId;

    const ttlValues = [
        { value: 604800, label: t('home.7_days') },
        { value: 259200, label: t('home.3_days') },
        { value: 86400, label: t('home.1_day') },
        { value: 43200, label: t('home.12_hours') },
        { value: 14400, label: t('home.4_hours') },
        { value: 3600, label: t('home.1_hour') },
        { value: 1800, label: t('home.30_minutes') },
        { value: 300, label: t('home.5_minutes') },
    ];

    // Features allowed for signed in users only
    // This is validated from the server as well
    if (isLoggedIn) {
        ttlValues.unshift(
            { value: 2419200, label: t('home.28_days') },
            { value: 1209600, label: t('home.14_days') }
        );
    }

    const groupMobileStyle = () => {
        if (!isMobile) {
            return {};
        }

        return {
            root: {
                maxWidth: '100% !important',
            },
        };
    };

    return (
        <Container>
            <form
                onSubmit={form.onSubmit((values) => {
                    onSubmit(values);
                })}
            >
                <Stack>
                    <Title order={1} size="h3" align="center">
                        {t('home.app_subtitle')}
                    </Title>
                    <Text size="sm" align="center">
                        {t('home.welcome')}
                    </Text>

                    {error && <ErrorBox message={error} />}

                    <Quill
                        defaultValue={t('home.maintxtarea')}
                        value={text}
                        onChange={onTextChange}
                        readOnly={inputReadOnly}
                        secretId={secretId}
                    />

                    <Group grow>
                        <TextInput
                            styles={groupMobileStyle}
                            icon={<IconLock size={14} />}
                            placeholder={t('home.title')}
                            readOnly={inputReadOnly}
                            {...form.getInputProps('title')}
                        />
                    </Group>

                    <Group grow>
                        <Select
                            zIndex={9999}
                            value={ttl}
                            onChange={onSelectChange}
                            data={ttlValues}
                            label={t('home.lifetime')}
                        />

                        <NumberInput
                            defaultValue={1}
                            min={1}
                            max={999}
                            placeholder="1"
                            label={t('home.max_views')}
                            {...form.getInputProps('maxViews')}
                        />
                    </Group>

                    <Group grow>
                        <Checkbox
                            styles={groupMobileStyle}
                            checked={enablePassword}
                            onChange={onEnablePassword}
                            readOnly={inputReadOnly}
                            color="hemmelig"
                            label={t('home.enable_password')}
                        />

                        <TextInput
                            styles={groupMobileStyle}
                            icon={<IconLock size={14} />}
                            placeholder={t('home.optional_password')}
                            minLength="8"
                            maxLength="28"
                            {...form.getInputProps('password')}
                            readOnly={!enablePassword || inputReadOnly}
                            rightSection={
                                <CopyButton value={form.values.password} timeout={2000}>
                                    {({ copied, copy }) => (
                                        <Tooltip
                                            label={copied ? t('copied') : t('copy')}
                                            withArrow
                                            position="right"
                                        >
                                            <ActionIcon
                                                color={copied ? 'teal' : 'gray'}
                                                onClick={copy}
                                            >
                                                {copied ? (
                                                    <IconCheck size={16} />
                                                ) : (
                                                    <IconCopy size={16} />
                                                )}
                                            </ActionIcon>
                                        </Tooltip>
                                    )}
                                </CopyButton>
                            }
                        />
                    </Group>

                    <Group grow>
                        <Checkbox
                            styles={groupMobileStyle}
                            readOnly={inputReadOnly}
                            color="hemmelig"
                            label={t('home.burn_aftertime')}
                            {...form.getInputProps('preventBurn')}
                        />

                        <Tooltip label={t('home.restrict_from_ip')}>
                            <TextInput
                                styles={groupMobileStyle}
                                icon={<IconLockAccess size={14} />}
                                placeholder={t('home.restrict_from_ip_placeholder')}
                                readOnly={inputReadOnly}
                                {...form.getInputProps('allowedIp')}
                            />
                        </Tooltip>
                    </Group>

                    {/* Disable file upload button*/}

                    {/* <Group grow={isMobile}>
                        <FileButton
                            disabled={config.get('settings.upload_restriction') && !isLoggedIn}
                            styles={groupMobileStyle}
                            multiple
                            {...form.getInputProps('files')}
                        >
                            {(props) => (
                                <Button
                                    {...props}
                                    label={
                                        config.get('settings.upload_restriction') && !isLoggedIn
                                            ? t('home.upload_files')
                                            : ''
                                    }
                                    color={
                                        config.get('settings.upload_restriction') && !isLoggedIn
                                            ? 'gray'
                                            : 'hemmelig-orange'
                                    }
                                >
                                    {t('home.upload_files')}
                                </Button>
                            )}
                        </FileButton>

                        {config.get('settings.upload_restriction') && !isLoggedIn && (
                            <Text size="sm" align="center" mt="sm">
                                {t('home.login_to_upload')}
                            </Text>
                        )}
                    </Group> */}

                    {form.values.files?.length > 0 && (
                        <Group>
                            {form.values.files.map((file, index) => (
                                <Badge
                                    className={style['file-badge']}
                                    color="orange"
                                    key={file.name}
                                >
                                    <Badge
                                        className={style['file-remove']}
                                        onClick={() => removeFile(index)}
                                    >
                                        &times;
                                    </Badge>
                                    {file.name}
                                </Badge>
                            ))}
                        </Group>
                    )}

                    {secretId && (
                        <>
                            <Group grow>
                                <TextInput
                                    label={t('home.your_secret_url')}
                                    icon={<IconLink size={14} />}
                                    value={getSecretURL()}
                                    onFocus={handleFocus}
                                    ref={secretRef}
                                    readOnly
                                    rightSection={
                                        <CopyButton value={getSecretURL()} timeout={2000}>
                                            {({ copied, copy }) => (
                                                <Tooltip
                                                    label={copied ? t('copied') : t('copy')}
                                                    withArrow
                                                    position="right"
                                                >
                                                    <ActionIcon
                                                        color={copied ? 'teal' : 'gray'}
                                                        onClick={copy}
                                                    >
                                                        {copied ? (
                                                            <IconCheck size={16} />
                                                        ) : (
                                                            <IconCopy size={16} />
                                                        )}
                                                    </ActionIcon>
                                                </Tooltip>
                                            )}
                                        </CopyButton>
                                    }
                                />
                            </Group>

                            <QRLink value={getSecretURL()} />

                            <Divider
                                my="xs"
                                variant="dashed"
                                labelPosition="center"
                                label={
                                    <Box ml={5}>
                                        {t('home.or', 'Separate the link and decryption key')}
                                    </Box>
                                }
                            />

                            <Group grow>
                                <TextInput
                                    label={t(
                                        'home.secret_url',
                                        'Secret URL without decryption key'
                                    )}
                                    icon={<IconLink size={14} />}
                                    value={getSecretURL(false)}
                                    onFocus={handleFocus}
                                    styles={groupMobileStyle}
                                    readOnly
                                    rightSection={
                                        <CopyButton value={getSecretURL(false)} timeout={2000}>
                                            {({ copied, copy }) => (
                                                <Tooltip
                                                    label={copied ? t('copied') : t('copy')}
                                                    withArrow
                                                    position="right"
                                                >
                                                    <ActionIcon
                                                        color={copied ? 'teal' : 'gray'}
                                                        onClick={copy}
                                                    >
                                                        {copied ? (
                                                            <IconCheck size={16} />
                                                        ) : (
                                                            <IconCopy size={16} />
                                                        )}
                                                    </ActionIcon>
                                                </Tooltip>
                                            )}
                                        </CopyButton>
                                    }
                                />

                                <TextInput
                                    label={t('home.decryption_key', 'Decryption key')}
                                    icon={<IconShieldLock size={14} />}
                                    value={encryptionKey}
                                    onFocus={handleFocus}
                                    styles={groupMobileStyle}
                                    readOnly
                                    rightSection={
                                        <CopyButton value={encryptionKey} timeout={2000}>
                                            {({ copied, copy }) => (
                                                <Tooltip
                                                    label={copied ? t('copied') : t('copy')}
                                                    withArrow
                                                    position="right"
                                                >
                                                    <ActionIcon
                                                        color={copied ? 'teal' : 'gray'}
                                                        onClick={copy}
                                                    >
                                                        {copied ? (
                                                            <IconCheck size={16} />
                                                        ) : (
                                                            <IconCopy size={16} />
                                                        )}
                                                    </ActionIcon>
                                                </Tooltip>
                                            )}
                                        </CopyButton>
                                    }
                                />
                            </Group>
                        </>
                    )}

                    {isMobile && secretId && navigator.share && (
                        <Group grow>
                            <Button
                                styles={() => ({
                                    root: {
                                        backgroundColor: 'var(--color-contrast-second)',
                                        '&:hover': {
                                            backgroundColor: 'var(--color-contrast-second)',
                                            filter: 'brightness(115%)',
                                        },
                                    },
                                })}
                                onClick={onShare}
                                leftIcon={<IconShare size={16} />}
                            >
                                {t('home.share')}
                            </Button>
                        </Group>
                    )}

                    <Group position="right" grow={isMobile}>
                        {!secretId && (
                            <Button
                                color="hemmelig"
                                leftIcon={<IconSquarePlus size={14} />}
                                loading={creatingSecret}
                                type="submit"
                            >
                                {t('home.create_secret_link')}
                            </Button>
                        )}

                        {secretId && (
                            <Button
                                color="hemmelig"
                                leftIcon={<IconSquarePlus size={14} />}
                                onClick={onNewSecret}
                            >
                                {t('home.create_new')}
                            </Button>
                        )}

                        {secretId && (
                            <Button
                                variant="gradient"
                                gradient={{ from: 'orange', to: 'red' }}
                                onClick={onBurn}
                                disabled={!secretId}
                                leftIcon={<IconTrash size={14} />}
                            >
                                {t('home.delete')}
                            </Button>
                        )}
                    </Group>
                </Stack>
            </form>

            <Divider my="sm" variant="dashed" />

            <Stack spacing="xs">
                <Text size="sm" align="center">
                    {t('home.link_only_works_once')}

                    <Text size="sm" align="center">
                        Every donation, no matter the size, makes a significant impact. Let's build
                        something amazing together! Thank you for being a part of our community and
                        supporting our vision.
                    </Text>
                </Text>
                <Text size="sm" align="center">
                    <Text size="sm" align="center">
                        <svg
                            width="20px"
                            height="20px"
                            viewBox="0.004 0 64 64"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                d="M63.04 39.741c-4.274 17.143-21.638 27.575-38.783 23.301C7.12 58.768-3.313 41.404.962 24.262 5.234 7.117 22.597-3.317 39.737.957c17.144 4.274 27.576 21.64 23.302 38.784z"
                                fill="#f7931a"
                            />
                            <path
                                d="M46.11 27.441c.636-4.258-2.606-6.547-7.039-8.074l1.438-5.768-3.512-.875-1.4 5.616c-.922-.23-1.87-.447-2.812-.662l1.41-5.653-3.509-.875-1.439 5.766c-.764-.174-1.514-.346-2.242-.527l.004-.018-4.842-1.209-.934 3.75s2.605.597 2.55.634c1.422.355 1.68 1.296 1.636 2.042l-1.638 6.571c.098.025.225.061.365.117l-.37-.092-2.297 9.205c-.174.432-.615 1.08-1.609.834.035.051-2.552-.637-2.552-.637l-1.743 4.02 4.57 1.139c.85.213 1.683.436 2.502.646l-1.453 5.835 3.507.875 1.44-5.772c.957.26 1.887.5 2.797.726L27.504 50.8l3.511.875 1.453-5.823c5.987 1.133 10.49.676 12.383-4.738 1.527-4.36-.075-6.875-3.225-8.516 2.294-.531 4.022-2.04 4.483-5.157zM38.087 38.69c-1.086 4.36-8.426 2.004-10.807 1.412l1.928-7.729c2.38.594 10.011 1.77 8.88 6.317zm1.085-11.312c-.99 3.966-7.1 1.951-9.083 1.457l1.748-7.01c1.983.494 8.367 1.416 7.335 5.553z"
                                fill="#ffffff"
                            />
                        </svg>{' '}
                        : bc1qkxg4d06nmzgprffewpdx384mx5mfj0vlzn857q
                    </Text>
                    <Text size="sm" align="center">
                        <svg
                            width="20px"
                            height="20px"
                            viewBox="0 0 32 32"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <g fill="none" fillRule="evenodd">
                                <circle cx={16} cy={16} r={16} fill="#F60" />
                                <path
                                    fill="#FFF"
                                    fillRule="nonzero"
                                    d="M15.97 5.235c5.985 0 10.825 4.84 10.825 10.824a11.07 11.07 0 01-.558 3.432h-3.226v-9.094l-7.04 7.04-7.04-7.04v9.094H5.704a11.07 11.07 0 01-.557-3.432c0-5.984 4.84-10.824 10.824-10.824zM14.358 19.02L16 20.635l1.613-1.614 3.051-3.08v5.72h4.547a10.806 10.806 0 01-9.24 5.192c-3.902 0-7.334-2.082-9.24-5.192h4.546v-5.72l3.08 3.08z"
                                />
                            </g>
                        </svg>{' '}
                        :
                        44ZkP4ynHw19Mqe3FJuUdJE6mEdEgNK6GTbbRg68neYYBmJbRaxPqJwjpKPVxpuuWLXKihLJRs1i4HxxbLDpZaCSJGCL5hN
                    </Text>
                    <Text size="sm" align="center">
                        <svg
                            width="20px"
                            height="20px"
                            viewBox="0 0 32 32"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <g fill="none" fillRule="evenodd">
                                <circle cx={16} cy={16} r={16} fill="#627EEA" />
                                <g fill="#FFF" fillRule="nonzero">
                                    <path fillOpacity=".602" d="M16.498 4v8.87l7.497 3.35z" />
                                    <path d="M16.498 4L9 16.22l7.498-3.35z" />
                                    <path fillOpacity=".602" d="M16.498 21.968v6.027L24 17.616z" />
                                    <path d="M16.498 27.995v-6.028L9 17.616z" />
                                    <path
                                        fillOpacity=".2"
                                        d="M16.498 20.573l7.497-4.353-7.497-3.348z"
                                    />
                                    <path fillOpacity=".602" d="M9 16.22l7.498 4.353v-7.701z" />
                                </g>
                            </g>
                        </svg>{' '}
                        : 0x05d61dD97c39ac16eC938EbCBa056B0e906Bde94
                    </Text>
                    <Text size="sm" align="center" pt="md">
                        <Text size="sm" align="center">
                            🙌 Together, we make it happen! 🙌"
                        </Text>
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}
                        >
                            <Text size="sm" align="center">
                                Special thanks for providing ideas to Cyron
                            </Text>
                            <img width={40} src="/public/Cyronlogowithoutbackground.png" alt="" />
                        </div>
                    </Text>
                </Text>
            </Stack>
        </Container>
    );
};

export default Home;
